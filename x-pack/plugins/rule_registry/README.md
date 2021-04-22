# Rule Registry

The rule registry plugin aims to make it easy for rule type producers to have their rules produce the data that they need to build rich experiences on top of a unified experience, without the risk of mapping conflicts.

A rule registry creates a template, an ILM policy, and an alias. The template mappings can be configured. It also injects a client scoped to these indices.

It also supports inheritance, which means that producers can create a registry specific to their solution or rule type, and specify additional mappings to be used.

The rule registry plugin creates a root rule registry, with the mappings defined needed to create a unified experience. Rule type producers can use the plugin to access the root rule registry, and create their own registry that branches off of the root rule registry. The rule registry client sees data from its own registry, and all registries that branches off of it. It does not see data from its parents.

## Enabling writing

Set

```yaml
xpack.ruleRegistry.unsafe.write.enabled: true
```

in your Kibana configuration to allow the Rule Registry to write events to the alert indices.

## Creating a rule registry

To create a rule registry, producers should add the `ruleRegistry` plugin to their dependencies. They can then use the `ruleRegistry.create` method to create a child registry, with the additional mappings that should be used by specifying `fieldMap`:

```ts
const observabilityRegistry = plugins.ruleRegistry.create({
  name: 'observability',
  fieldMap: {
    ...pickWithPatterns(ecsFieldMap, 'host.name', 'service.name'),
  },
});
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

## Rule registry client

The rule registry client can either be injected in the executor, or created in the scope of a request. It exposes a `search` method and a `bulkIndex` method. When `search` is called, it first gets all the rules the current user has access to, and adds these ids to the search request that it executes. This means that the user can only see data from rules they have access to.

Both `search` and `bulkIndex` are fully typed, in the sense that they reflect the mappings defined for the registry.

## Schema

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
