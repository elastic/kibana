# RAC

The RAC plugin provides a common place to register rules with alerting. You can:

- Register types of rules
- Perform CRUD actions on rules
- Perform CRUD actions on alerts produced by rules

----

Table of Contents

- [Rule Registry](#rule-registry)
- [Role Based Access-Control](#rbac)

## Rule Registry
The rule registry plugin aims to make it easy for rule type producers to have their rules produce the data that they need to build rich experiences on top of a unified experience, without the risk of mapping conflicts.

A rule registry creates a template, an ILM policy, and an alias. The template mappings can be configured. It also injects a client scoped to these indices.

It also supports inheritance, which means that producers can create a registry specific to their solution or rule type, and specify additional mappings to be used.

The rule registry plugin creates a root rule registry, with the mappings defined needed to create a unified experience. Rule type producers can use the plugin to access the root rule registry, and create their own registry that branches off of the root rule registry. The rule registry client sees data from its own registry, and all registries that branches off of it. It does not see data from its parents.

Creating a rule registry

To create a rule registry, producers should add the `ruleRegistry` plugin to their dependencies. They can then use the `ruleRegistry.create` method to create a child registry, with the additional mappings that should be used by specifying `fieldMap`:

```ts
const observabilityRegistry = plugins.ruleRegistry.create({
  name: 'observability',
  fieldMap: {
    ...pickWithPatterns(ecsFieldMap, 'host.name', 'service.name'),
  },
})
```

`fieldMap` is a key-value map of field names and mapping options:

```ts
{
  '@timestamp': {
    type: 'date',
    array: false,
    required: true,
  }
}
```

ECS mappings are generated via a script in the rule registry plugin directory. These mappings are available in x-pack/plugins/rule_registry/server/generated/ecs_field_map.ts.

To pick many fields, you can use `pickWithPatterns`, which supports wildcards with full type support.

If a registry is created, it will initialise as soon as the core services needed become available. It will create a (versioned) template, alias, and ILM policy, but only if these do not exist yet.

### Rule registry client

The rule registry client can either be injected in the executor, or created in the scope of a request. It exposes a `search` method and a `bulkIndex` method. When `search` is called, it first gets all the rules the current user has access to, and adds these ids to the search request that it executes. This means that the user can only see data from rules they have access to.

Both `search` and `bulkIndex` are fully typed, in the sense that they reflect the mappings defined for the registry.

### Schema

The following fields are available in the root rule registry:

- `@timestamp`: the ISO timestamp of the alert event. For the lifecycle rule type helper, it is always the value of `startedAt` that is injected by the Kibana alerting framework.
- `event.kind`: signal (for the changeable alert document), state (for the state changes of the alert, e.g. when it opens, recovers, or changes in severity), or metric (individual evaluations that might be related to an alert).
- `event.action`: the reason for the event. This might be `open`, `close`, `active`, or `evaluate`.
- `tags`: tags attached to the alert. Right now they are copied over from the rule.
- `rule.id`: the identifier of the rule type, e.g. `apm.transaction_duration`
- `rule.uuid`: the saved objects id of the rule.
- `rule.name`: the name of the rule (as specified by the user).
- `rule.category`: the name of the rule type (as defined by the rule type producer)
- `kibana.rac.producer`: the producer of the rule type. Usually a Kibana plugin. e.g., `APM`.
- `kibana.rac.alert.id`: the id of the alert, that is unique within the context of the rule execution it was created in. E.g., for a rule that monitors latency for all services in all environments, this might be `opbeans-java:production`.
- `kibana.rac.alert.uuid`: the unique identifier for the alert during its lifespan. If an alert recovers (or closes), this identifier is re-generated when it is opened again.
- `kibana.rac.alert.status`: the status of the alert. Can be `open` or `closed`.
- `kibana.rac.alert.start`: the ISO timestamp of the time at which the alert started.
- `kibana.rac.alert.end`: the ISO timestamp of the time at which the alert recovered. 
- `kibana.rac.alert.duration.us`: the duration of the alert, in microseconds. This is always the difference between either the current time, or the time when the alert recovered. 
- `kibana.rac.alert.severity.level`: the severity of the alert, as a keyword (e.g. critical).
- `kibana.rac.alert.severity.value`: the severity of the alert, as a numerical value, which allows sorting.

This list is not final - just a start. Field names might change or moved to a scoped registry. If we implement log and sequence based rule types the list of fields will grow. If a rule type needs additional fields, the recommendation would be to have the field in its own registry first (or in its producer’s registry), and if usage is more broadly adopted, it can be moved to the root registry.

## Role Based Access-Control

Rules registered through the rule registry produce `alerts` that are indexed into the `.alerts` index. Using the `producer` defined in the rule registry, these alerts inheret the `producer` property which is used in the auth to determine whether a user has access to these alerts and what operations they can perform on them.

Users will need to be granted access to these `alerts`. When registering a feature in Kibana you can specify multiple types of privileges which are granted to users when they're assigned certain roles. Assuming your feature generates `alerts`, you'll want to control which roles have all/read privileges for these alerts that are scoped to your feature. For example, the `security_solution` plugin allows users to create rules that generate `alerts`, so does `observability`. The `security_solution` plugin only wants to grant it's users access to `alerts` belonging to `security_solution`. However, a user may have access to numerous `alerts` like `['security_solution', 'observability']`.

You can control all of these abilities by assigning privileges to Alerts from within your own feature, for example:

```typescript
features.registerKibanaFeature({
	id: 'my-application-id',
	name: 'My Application',
	app: [],
	privileges: {
		all: {
			alerts: {
				all: [
					// grant `all` over our own types
					'my-application-id.my-feature',
					'my-application-id.my-restricted-alert-type',
					// grant `all` over the built-in IndexThreshold
					'.index-threshold',
					// grant `all` over Uptime's TLS AlertType
					'xpack.uptime.alerts.actionGroups.tls'
				],
			},
		},
		read: {
			alerts: {
				read: [
					// grant `read` over our own type
					'my-application-id.my-feature',
					// grant `read` over the built-in IndexThreshold
					'.index-threshold', 
					// grant `read` over Uptime's TLS AlertType
					'xpack.uptime.alerts.actionGroups.tls'
				],
			},
		},
	},
});
```

In this example we can see the following:
- Our feature grants any user who's assigned the `all` role in our feature the `all` role in the Alerting framework over every alert of the `my-application-id.my-alert-type` type which is created _inside_ the feature. What that means is that this privilege will allow the user to execute any of the `all` operations (listed below) on these alerts as long as their `consumer` is `my-application-id`. Below that you'll notice we've done the same with the `read` role, which is grants the Alerting Framework's `read` role privileges over these very same alerts.
- In addition, our feature grants the same privileges over any alert of type `my-application-id.my-restricted-alert-type`, which is another hypothetical alertType registered by this feature. It's worth noting though that this type has been omitted from the `read` role. What this means is that only users with the `all` role will be able to interact with alerts of this type.
- Next, lets look at the `.index-threshold` and `xpack.uptime.alerts.actionGroups.tls` types. These have been specified in both `read` and `all`, which means that all the users in the feature will gain privileges over alerts of these types (as long as their `consumer` is `my-application-id`). The difference between these two and the previous two is that they are _produced_ by other features! `.index-threshold` is a built-in type, provided by the _Built-In Alerts_ feature, and `xpack.uptime.alerts.actionGroups.tls` is an AlertType provided by the _Uptime_ feature. Specifying these type here tells the Alerting Framework that as far as the `my-application-id` feature is concerned, the user is privileged to use them (with `all` and `read` applied), but that isn't enough. Using another feature's AlertType is only possible if both the producer of the AlertType, and the consumer of the AlertType, explicitly grant privileges to do so. In this case, the _Built-In Alerts_ & _Uptime_ features would have to explicitly add these privileges to a role and this role would have to be granted to this user.

It's important to note that any role can be granted a mix of `all` and `read` privileges accross multiple type, for example:

```typescript
features.registerKibanaFeature({
  id: 'my-application-id',
  name: 'My Application',
  app: [],
  privileges: {
    all: {
      app: ['my-application-id', 'kibana'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: [],
      api: [],
    },
    read: {
      app: ['lens', 'kibana'],
      alerting: {
        all: [
          'my-application-id.my-alert-type'
        ],
        read: [
          'my-application-id.my-restricted-alert-type'
        ],
      },
      savedObject: {
        all: [],
        read: [],
      },
      ui: [],
      api: [],
    },
  },
});
```

In the above example, you note that instead of denying users with the `read` role any access to the `my-application-id.my-restricted-alert-type` type, we've decided that these users _should_ be granted `read` privileges over the _resitricted_ AlertType.
As part of that same change, we also decided that not only should they be allowed to `read` the _restricted_ AlertType, but actually, despite having `read` privileges to the feature as a whole, we do actually want to allow them to create our basic 'my-application-id.my-alert-type' AlertType, as we consider it an extension of _reading_ data in our feature, rather than _writing_ it.

### `read` privileges vs. `all` privileges
When a user is granted the `read` role in for Alerts, they will be able to execute the following api calls:
- `get`
- `find`

When a user is granted the `all` role in the Alerting Framework, they will be able to execute all of the `read` privileged api calls, but in addition they'll be granted the following calls:
- `update`

Attempting to execute any operation the user isn't privileged to execute will result in an Authorization error thrown by the AlertsClient.