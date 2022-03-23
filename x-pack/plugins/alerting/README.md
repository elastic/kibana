# Kibana Alerting

The Kibana Alerting plugin provides a common place to set up rules. You can:

- Register types of rules
- List the types of registered rules
- Perform CRUD actions on rules

----

Table of Contents

- [Kibana Alerting](#kibana-alerting)
	- [Terminology](#terminology)
	- [Usage](#usage)
	- [Alerting API Keys](#alerting-api-keys)
	- [Plugin Status](#plugin-status)
	- [Rule Types](#rule-types)
		- [Methods](#methods)
		- [Executor](#executor)
		- [Action variables](#action-variables)
	- [Recovered Alerts](#recovered-alerts)
	- [Licensing](#licensing)
	- [Documentation](#documentation)
	- [Tests](#tests)
		- [Example](#example)
	- [Role Based Access-Control](#role-based-access-control)
	- [Alerting Navigation](#alert-navigation)
	- [Internal HTTP APIs](#internal-http-apis)
		- [`GET /internal/alerting/rule/{id}/state`: Get rule state](#get-internalalertingruleidstate-get-rule-state)
		- [`GET /internal/alerting/rule/{id}/_alert_summary`: Get rule alert summary](#get-internalalertingruleidalertsummary-get-rule-alert-summary)
		- [`POST /internal/alerting/rule/{id}/_update_api_key`: Update rule API key](#post-internalalertingruleidupdateapikey-update-rule-api-key)
	- [Alert Factory](#alert-factory)
	- [Templating Actions](#templating-actions)
		- [Examples](#examples)

## Terminology

> Disclaimer: We are actively working to update the terminology of the Alerting Framework. While all user-facing terminology has been updated, much of the codebase is still a work in progress.


> References to `rule` and `rule type` entities are still named `AlertType` within the codebase.

**Rule Type**: A function that takes parameters and executes actions on alerts.

**Rule**: A configuration that defines a schedule, a rule type w/ parameters, state information and actions.

**Alert**: The alert(s) created from a rule execution.

A Kibana rule detects a condition and executes one or more actions when that condition occurs.  Rules work by going through the followings steps:

1. Run a periodic check to detect a condition (the check is provided by a rule type).
2. Convert that condition into one or more stateful alerts.
3. Map alerts to pre-defined actions, using templating.
4. Execute the actions.

## Usage

1. Develop and register a rule type (see rule types -> example).
2. Configure feature level privileges using RBAC.
3. Create a rule using the RESTful API [Documentation](https://www.elastic.co/guide/en/kibana/master/alerting-apis.html) (see rules -> create).

## Alerting API Keys

When we create a rule, we generate a new API key.

When we update, enable, or disable a rule, we must invalidate the old API key and create a new one.

To manage the invalidation process for API keys, we use the saved object type `api_key_pending_invalidation`.  This saved object stores all API keys that were marked for invalidation anytime rules were updated, enabled or disabled.

For security plugin invalidation, we schedule a task to check if the `api_key_pending_invalidation` saved object contains new API keys that were marked for invalidation earlier than the configured delay. The default schedule for running this task is every 5 minutes.

To change the schedule for the invalidation task, use the kibana.yml configuration option `xpack.alerting.invalidateApiKeysTask.interval`.

To change the default delay for the API key invalidation, use the kibana.yml configuration option `xpack.alerting.invalidateApiKeysTask.removalDelay`.

## Rule Types

### Methods

**server.newPlatform.setup.plugins.alerting.registerType(options)**

The following table describes the properties of the `options` object.

|Property|Description|Type|
|---|---|---|
|id|Unique identifier for the rule type. By convention, IDs starting with `.` are reserved for built-in rule types. We recommend using a convention like `<plugin_id>.mySpecialRule` for your rule types to avoid conflicting with another plugin.|string|
|name|A user-friendly name for the rule type. These will be displayed in dropdowns when choosing rule types.|string|
|actionGroups|An explicit list of groups the rule type may schedule actions for, each specifying the ActionGroup's unique ID and human readable name. Each rule type's `actions` validation will use this list to ensure configured groups are valid. We highly encourage using `kbn-i18n` to translate the names of actionGroup  when registering the rule type. |Array<{id:string, name:string}>|
|defaultActionGroupId|ID value for the default action group for the rule type.|string|
|recoveryActionGroup|The action group to use when an alert goes from an active state to an inactive one. This action group should not be specified under the `actionGroups` property. If no recoveryActionGroup is specified, the default `recovered` action group will be used. |{id:string, name:string}|
|actionVariables|An explicit list of action variables that the rule type makes available via context and state in action parameter templates, and a short human readable description for each. The Alerting UI  will use this to display prompts for the users for these variables, in action parameter editors. We highly encourage using `kbn-i18n` to translate the descriptions. |{ context: Array<{name:string, description:string}, state: Array<{name:string, description:string}>|
|validate.params|When developing a rule type, you can choose to accept a series of parameters. You may also choose to have the parameters validated before they are passed to the `executor` function or created as a saved object. In order to do this, provide a `@kbn/config-schema` schema that we will use to validate the `params` attribute.|@kbn/config-schema|
|executor|This is where the code for the rule type lives. This is a function to be called when executing a rule on an interval basis. For full details, see the executor section below.|Function|
|producer|The id of the application producing this rule type.|string|
|minimumLicenseRequired|The value of a minimum license. Most of the rules are licensed as "basic".|string|
|ruleTaskTimeout|The length of time a rule can run before being cancelled due to timeout. By default, this value is "5m".|string|
|cancelAlertsOnRuleTimeout|Whether to skip writing alerts and scheduling actions if a rule execution is cancelled due to timeout. By default, this value is set to "true".|boolean|
|useSavedObjectReferences.extractReferences|(Optional) When developing a rule type, you can choose to implement hooks for extracting saved object references from rule parameters. This hook will be invoked when a rule is created or updated. Implementing this hook is optional, but if an extract hook is implemented, an inject hook must also be implemented.|Function
|useSavedObjectReferences.injectReferences|(Optional) When developing a rule type, you can choose to implement hooks for injecting saved object references into rule parameters. This hook will be invoked when a rule is retrieved (get or find). Implementing this hook is optional, but if an inject hook is implemented, an extract hook must also be implemented.|Function
|isExportable|Whether the rule type is exportable from the Saved Objects Management UI.|boolean|
|defaultScheduleInterval|The default interval that will show up in the UI when creating a rule of this rule type.|boolean|
|doesSetRecoveryContext|Whether the rule type will set context variables for recovered alerts. Defaults to `false`. If this is set to true, context variables are made available for the recovery action group and executors will be provided with the ability to set recovery context.|boolean|

### Executor

This is the primary function for a rule type. Whenever the rule needs to execute, this function will perform the execution. It receives a variety of parameters. The following table describes the properties the executor receives.

**executor(options)**

|Property|Description|
|---|---|
|services.scopedClusterClient|This is an instance of the Elasticsearch client. Use this to do Elasticsearch queries in the context of the user who created the alert when security is enabled.|
|services.savedObjectsClient|This is an instance of the saved objects client. This provides the ability to perform CRUD operations on any saved object that lives in the same space as the rule.<br><br>The scope of the saved objects client is tied to the user who created the rule (only when security is enabled).|
|services.alertFactory|This [alert factory](#alert-factory) creates alerts and must be used in order to schedule action execution. The id you give to the alert factory create function() is a unique identifier for the alert.|
|services.log(tags, [data], [timestamp])|Use this to create server logs. (This is the same function as server.log)|
|services.shouldWriteAlerts()|This returns a boolean indicating whether the executor should write out alerts as data. This is determined by whether rule execution has been cancelled due to timeout AND whether both the Kibana `cancelAlertsOnRuleTimeout` flag and the rule type `cancelAlertsOnRuleTimeout` are set to `true`.|
|services.shouldStopExecution()|This returns a boolean indicating whether rule execution has been cancelled due to timeout.|
|startedAt|The date and time the rule type started execution.|
|previousStartedAt|The previous date and time the rule type started a successful execution.|
|params|Parameters for the execution. This is where the parameters you require will be passed in. (e.g. threshold). Use rule type validation to ensure values are set before execution.|
|state|State returned from the previous execution. This is the rule level state. What the executor returns will be serialized and provided here at the next execution.|
|alertId|The id of this rule.|
|spaceId|The id of the space of this rule.|
|namespace|The namespace of the space of this rule. This is the same as `spaceId`, unless `spaceId === "default"`, in which case the namespace = `undefined`.|
|name|The name of this rule. This will eventually be removed in favor of `rule.name`.|
|tags|The tags associated with this rule. This will eventually be removed in favor of `rule.tags`.|
|createdBy|The user ID of the user that created this rule. This will eventually be removed in favor of `rule.createdBy`.|
|updatedBy|The user ID of the user that last updated this rule. This will eventually be removed in favor of `rule.updatedBy`.|
|rule.name|The name of this rule.|
|rule.tags|The tags associated with this rule.|
|rule.consumer|The consumer of this rule type.|
|rule.producer|The producer of this rule type.|
|rule.ruleTypeId|The ID of the rule type for this rule.|
|rule.ruleTypeName|The user-friendly name of the rule type for this rule.|
|rule.enabled|Whether this rule is currently enabled.|
|rule.schedule|The configured schedule interval of this rule.|
|rule.actions|The configured actions for this rule.|
|rule.createdBy|The user ID of the user that created this rule.|
|rule.updatedBy|The user ID of the user that last updated this rule.|
|rule.createdAt|The date and time this rule was created.|
|rule.updatedAt|The date and this this rule was last updated.|
|rule.throttle|The configured throttle interval for this rule.|
|rule.notifyWhen|The configured notification type for this rule.|

### Action Variables

The `actionVariables` property should contain the **flattened** names of the state and context variables available when an executor calls `alertInstance.scheduleActions(actionGroup, context)`.  These names are meant to be used in prompters in the Alerting UI, are used as text values for display, and can be inserted into to an action parameter text entry field via a UI gesture (e.g., clicking a menu item from a menu built with these names).  They should be flattened, so if a state or context variable is an object with properties, these should be listed with the "parent" property/properties in the name, separated by a `.` (period).

For example, if the `context` has one variable `foo` which is an object that has one property `bar`, and there are no `state` variables, the `actionVariables` value would be in the following shape:

```js
{
	context: [
		{ name: 'foo.bar', description: 'the ultra-exciting bar property' },
	]
}
```

### useSavedObjectReferences Hooks

This is an optional pair of functions that can be implemented by a rule type. Both `extractReferences` and `injectReferences` functions must be implemented if either is impemented.

**useSavedObjectReferences.extractReferences**

This function should take the rule type params as input and extract out any saved object IDs stored within the params. For each saved object ID, a new saved object reference should be created and a saved object reference should replace the saved object ID in the rule params. This function should return the modified rule type params (with saved object reference name, not IDs) and an array of saved object references.


**useSavedObjectReferences.injectReferences**


This function should take the rule type params (with saved object references) and the saved object references array as input and inject the saved object ID in place of any saved object references in the rule type params. Note that any error thrown within this function will be propagated.

## Recovered Alerts
The Alerting framework automatically determines which alerts are recovered by comparing the active alerts from the previous rule execution to the active alerts in the current rule execution. Alerts that were active previously but not active currently are considered `recovered`. If any actions were specified on the Recovery action group for the rule, they will be scheduled at the end of the execution cycle.

Because this determination occurs after rule type executors have completed execution, the framework provides a mechanism for rule type executors to set contextual information for recovered alerts that can be templated and used inside recovery actions. In order to use this mechanism, the rule type must set the `doesSetRecoveryContext` flag to `true` during rule type registration.

Then, the following code would be added within a rule type executor. As you can see, when the rule type is finished creating and scheduling actions for active alerts, it should call `done()` on the alertFactory. This will give the executor access to the list recovered alerts for this execution cycle, for which it can iterate and set context.

```
// Create and schedule actions for active alerts
for (const i = 0; i < 5; ++i) {
  alertFactory
    .create('server_1')
    .scheduleActions('default', {
      server: 'server_1',
    });
}

// Call done() to gain access to recovery utils
// If `doesSetRecoveryContext` is set to `false`, getRecoveredAlerts() returns an empty list
const { getRecoveredAlerts } = alertsFactory.done();

for (const alert of getRecoveredAlerts()) {
	const alertId = alert.getId();
	alert.setContext({
		server: <set something useful here>
	})
}
```
## Licensing

Currently most rule types are free features. But some rule types are subscription features, such as the tracking containment rule.

## Documentation

You should create asciidoc for each new rule type you develop:

- For stack rules, add an entry to the rule type index - [`docs/user/alerting/stack-rules.asciidoc`](../../../docs/user/alerting/stack-rules.asciidoc) which points to a new document for the rule type that should live in the directory [`docs/user/alerting/stack-rules`](../../../docs/user/alerting/stack-rules).

- Solution specific rule documentation should live within the docs for the solution.

We suggest following the template provided in `docs/rule-type-template.asciidoc`. The [Index Threshold rule type](https://www.elastic.co/guide/en/kibana/master/rule-type-index-threshold.html) is an example of documentation created following the template.

## Tests

The rule type should have jest tests and, optionally, functional tests.
In the tests, we recommend testing the expected rule execution result with different input params, testing the structure of the created rule and testing the parameter validation. The rest will be guaranteed as a framework functionality.

### Example

This example rule type receives server and threshold as parameters. It will read the CPU usage of the server and schedule actions to be executed (asynchronously by the task manager) if the usage is greater than the threshold.

```typescript
import { schema } from '@kbn/config-schema';
import { RuleType, AlertExecutorOptions } from '../../../alerting/server';
// These type names will eventually be updated to reflect the new terminology
import {
	AlertTypeParams,
	AlertTypeState,
	AlertInstanceState,
	AlertInstanceContext,
} from '../../../alerting/common';
...
interface MyRuleTypeParams extends AlertTypeParams {
	server: string;
	threshold: number;
	testSavedObjectId: string;
}

interface MyRuleTypeExtractedParams extends AlertTypeParams {
	server: string;
	threshold: number;
	testSavedObjectRef: string;
}

interface MyRuleTypeState extends AlertTypeState {
	lastChecked: Date;
}

interface MyRuleTypeAlertState extends AlertInstanceState {
	cpuUsage: number;
}

interface MyRuleTypeAlertContext extends AlertInstanceContext {
	server: string;
	hasCpuUsageIncreased: boolean;
}

type MyRuleTypeActionGroups = 'default' | 'warning';
  
const myRuleType: RuleType<
	MyRuleTypeParams,
	MyRuleTypeExtractedParams,
	MyRuleTypeState,
	MyRuleTypeAlertState,
	MyRuleTypeAlertContext,
	MyRuleTypeActionGroups
> = {
	id: 'my-rule-type',
	name: 'My rule type',
	validate: {
		params: schema.object({
			server: schema.string(),
			threshold: schema.number({ min: 0, max: 1 }),
		}),
	},
	actionGroups: [
		{
			id: 'default',
			name: 'Default',
		},
		{
			id: 'warning',
			name: 'Warning',
		},
	],
	defaultActionGroupId: 'default',
	actionVariables: {
		context: [
			{ name: 'server', description: 'the server' },
			{ name: 'hasCpuUsageIncreased', description: 'boolean indicating if the cpu usage has increased' },
		],
		state: [
			{ name: 'cpuUsage', description: 'CPU usage' },
		],
	},
	minimumLicenseRequired: 'basic',
	isExportable: true,
	async executor({
		alertId,
		startedAt,
		previousStartedAt,
		services,
		params,
		state,
		rule,
	}: AlertExecutorOptions<
		MyRuleTypeParams,
		MyRuleTypeExtractedParams,
		MyRuleTypeState,
		MyRuleTypeAlertState,
		MyRuleTypeAlertContext,
		MyRuleTypeActionGroups
	>) {
		// Let's assume params is { server: 'server_1', threshold: 0.8 }
		const { server, threshold } = params;

		// Query Elasticsearch using a cancellable search
		// If rule execution is cancelled mid-search, the search request will be aborted
		// and an error will be thrown.
		const esClient = services.scopedClusterClient.asCurrentUser;
		await esClient.search(esQuery);

		// Call a function to get the server's current CPU usage
		const currentCpuUsage = await getCpuUsage(server);

		// Periodically check that execution should continue
		if (services.shouldStopExecution()) {
			throw new Error('short circuiting rule execution!');
		}

		// Only execute if CPU usage is greater than threshold
		if (currentCpuUsage > threshold) {
			// The first argument is a unique identifier for the alert. In this 
			// scenario the provided server will be used. Also, this ID will be 
			// used to make `getState()` return previous state, if any, on 
			// matching identifiers.
			const alert = services.alertFactory.create(server);

			// State from the last execution. This will exist if an alert was
			// created and executed in the previous execution
			const { cpuUsage: previousCpuUsage } = alert.getState();

			// Replace state entirely with new values
			alert.replaceState({
				cpuUsage: currentCpuUsage,
			});

			// 'default' refers to the id of a group of actions to be scheduled 
			// for execution, see 'actions' in create rule section
			alert.scheduleActions('default', {
				server,
				hasCpuUsageIncreased: currentCpuUsage > previousCpuUsage,
			});
		}

		// Returning updated rule type level state, this will become available
		// within the `state` function parameter at the next execution
		return {
			// This is an example attribute you could set, it makes more sense 
			// to use this state when the rule type executes multiple 
			// alerts but wants a single place to track certain values.
			lastChecked: new Date(),
		};
	},
	producer: 'alerting',
	ruleTaskTimeout: '10m',
	useSavedObjectReferences: {
		extractReferences: (params: Params): RuleParamsAndRefs<ExtractedParams> => {
			const { testSavedObjectId, ...otherParams } = params;

			const testSavedObjectRef = 'testRef_0';
			const references = [
				{
					name: `testRef_0`,
					id: testSavedObjectId,
					type: 'index-pattern',
				},
			];
			return { params: { ...otherParams, testSavedObjectRef }, references };
		},
		injectReferences: (params: SavedObjectAttributes, references: SavedObjectReference[]) => {
			const { testSavedObjectRef, ...otherParams } = params;
			const reference = references.find((ref) => ref.name === testSavedObjectRef);
			if (!reference) {
				throw new Error(`Test reference "${testSavedObjectRef}"`);
			}
			return { ...otherParams, testSavedObjectId: reference.id } as Params;
		},
	}
};

server.newPlatform.setup.plugins.alerting.registerType(myRuleType);
```

## Role Based Access-Control

Once you have registered your RuleType, you need to grant your users privileges to use it.
When registering a feature in Kibana you can specify multiple types of privileges which are granted to users when they're assigned certain roles.

Assuming your feature introduces its own AlertTypes, you'll want to control which roles have all/read privileges for the rules and alerts for these AlertTypes when they're inside the feature.
In addition, when users are inside your feature, you might want to grant them access to rules and alerts for AlertTypes from other features, such as built-in stack rules or rule types provided by other features.

You can control all of these abilities by assigning privileges to the Alerting Framework from within your own feature, for example:

```typescript
features.registerKibanaFeature({
	id: 'my-application-id',
	name: 'My Application',
	app: [],
	alerting: [
		'my-application-id.my-rule-type',
		'my-application-id.my-restricted-rule-type',
		'.index-threshold',
		'xpack.uptime.alerts.actionGroups.tls'
	],
	privileges: {
		all: {
			alerting: {
				rule: {
					all: [
						// grant `all` over our own types
						'my-application-id.my-rule-type',
						'my-application-id.my-restricted-rule-type',
						// grant `all` over the built-in IndexThreshold
						'.index-threshold',
						// grant `all` over Uptime's TLS rule type
						'xpack.uptime.alerts.actionGroups.tls'
					],
				},
				alert: {
					all: [
						// grant `all` over our own types
						'my-application-id.my-rule-type',
						'my-application-id.my-restricted-rule-type',
						// grant `all` over the built-in IndexThreshold
						'.index-threshold',
						// grant `all` over Uptime's TLS rule type
						'xpack.uptime.alerts.actionGroups.tls'
					],
				}
			},
		},
		read: {
			alerting: {
				rule: {
					read: [
						// grant `read` over our own type
						'my-application-id.my-alert-type',
						// grant `read` over the built-in IndexThreshold
						'.index-threshold', 
						// grant `read` over Uptime's TLS RuleType
						'xpack.uptime.alerts.actionGroups.tls'
					],
				},
				alert: {
					read: [
						// grant `read` over our own type
						'my-application-id.my-alert-type',
						// grant `read` over the built-in IndexThreshold
						'.index-threshold', 
						// grant `read` over Uptime's TLS RuleType
						'xpack.uptime.alerts.actionGroups.tls'
					],
				},
			},
		},
	},
});
```

In this example we can see the following:

- Our feature grants any user who's assigned the `all` role in our feature the `all` role in the Alerting Framework over every rule and alert of the rule type `my-application-id.my-rule-type` type which is created _inside_ the feature. What that means is that this privilege will allow the user to execute any of the `all` operations (listed below) on these rules and alerts as long as their `consumer` is `my-application-id`. Below that you'll notice we've done the same with the `read` role, which is grants the Alerting Framework's `read` role privileges over these very same rules and alerts.
- In addition, our feature grants the same privileges over any rule or alert of rule type `my-application-id.my-restricted-rule-type`, which is another hypothetical rule type registered by this feature. It's worth noting that this type has been omitted from the `read` role. What this means is that only users with the `all` role will be able to interact with rules and alerts of this rule type.
- Next, let's look at the `.index-threshold` and `xpack.uptime.alerts.actionGroups.tls` types. These have been specified in both `read` and `all`, which means that all the users in the feature will gain privileges over rules and alerts of these rule types (as long as their `consumer` is `my-application-id`). The difference between these two and the previous two is that they are _produced_ by other features! `.index-threshold` is a built-in stack rule type, provided by the _Stack Rules_ feature, and `xpack.uptime.alerts.actionGroups.tls` is a rule type provided by the _Uptime_ feature. Specifying these types here tells the Alerting Framework that as far as the `my-application-id` feature is concerned, the user is privileged to use them (with `all` and `read` applied), but that isn't enough. Using another feature's rule type is only possible if both the producer of the rule type and the consumer of the rule type explicitly grant privileges to do so. In this case, the _Stack Rules_ & _Uptime_ features would have to explicitly add these privileges to a role and this role would have to be granted to this user.

It's important to note that any role can be granted a mix of `all` and `read` privileges across multiple types, for example:

```typescript
features.registerKibanaFeature({
  id: 'my-application-id',
  name: 'My Application',
  app: [],
  alerting: [
    'my-application-id.my-rule-type',
    'my-application-id.my-restricted-rule-type'
  ],
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
        rule: {
          all: [
            'my-application-id.my-rule-type'
          ],
          read: [
            'my-application-id.my-restricted-rule-type'
          ],
        }, 
        alert: {
          all: [
            'my-application-id.my-rule-type'
          ],
          read: [
            'my-application-id.my-restricted-rule-type'
          ],
        }, 
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

In the above example, note that instead of denying users with the `read` role any access to the `my-application-id.my-restricted-rule-type` type, we've decided that these users _should_ be granted `read` privileges over the _restricted_ rule type.
As part of that same change, we also decided that not only should they be allowed to `read` the _restricted_ rule type, but actually, despite having `read` privileges to the feature as a whole, we do actually want to allow them to create our basic 'my-application-id.my-rule-type' rule type, as we consider it an extension of _reading_ data in our feature, rather than _writing_ it.

### Subfeature privileges

In the above examples, we have been giving the same level of access to both rules and alerts for a particular rule type. There may be cases when you want your feature privilege to allow for escalated or de-escalated privileges for either rules or alerts within a feature. We can use subfeature privileges to achieve this granularity.

For more information and other examples of subfeature privilege, refer to the [user documentation](https://www.elastic.co/guide/en/kibana/master/development-security.html#example-3-discover).

```typescript
features.registerKibanaFeature({
  id: 'my-application-id',
  name: 'My Application',
  app: [],
  alerting: [
    'my-application-id.my-rule-type',
    'my-application-id.my-other-rule-type'
  ],
  privileges: {
    all: {
      app: ['my-application-id', 'kibana'],
      savedObject: {
        all: [],
        read: [],
      },
      alerting: {
        rule: {
          all: [
            'my-application-id.my-rule-type',
            'my-application-id.my-other-rule-type'
          ]
        },
        alert: {
          read: [
            'my-application-id.my-rule-type',
            'my-application-id.my-other-rule-type'
          ]
        }
      },
      ui: [],
      api: [],
    },
    read: {
      app: ['lens', 'kibana'],
      alerting: {
        rule: {
          read: [
            'my-application-id.my-rule-type',
            'my-application-id.my-other-rule-type'
          ]
        },
        alert: {
          read: [
            'my-application-id.my-rule-type',
            'my-application-id.my-other-rule-type'
          ]
        }
      },
      savedObject: {
        all: [],
        read: [],
      },
      ui: [],
      api: [],
    },
  },
  subFeatures: [
    {
      name: 'Manage Alerts',
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              id: 'alert_manage',
              name: 'Manage Alerts',
              includeIn: 'all',
              alerting: {
                alert: {
                  all: [
                    'my-application-id.my-rule-type',
                    'my-application-id.my-other-rule-type'
                  ],
                },
              },
              savedObject: {
                all: [],
                read: [],
              },
              ui: [],
            }
          ]
        }
      ]
    }
  ]
});
```

In the above example, note that the base feature privilege grants users with the `all` role `all` access the rules of the specified rule types but only `read` access to the alerts of the same rule type. In order to get `all` access to the alerts of these rule types, the role must grant the `alert_manage` subfeature privilege. Because the `alert_manage` subfeature privilege has `includeIn` set to `all`, it is _automatically_ included in the `all` feature privilege but can be excluded when the role is defined.

This subfeature privilege definition allows for the following granularity:

- `all` privileges to rules for a rule type and `all` privileges to alerts for a rule type
- `all` privileges to rules for a rule type and subprivilege de-escalation to grant only `read` privileges to alerts for a rule type
- `read` privileges to rules for a rule type and `read` privileges to alerts for a rule type
- `read` privileges to rules for a rule type and subprivilege escalation to grant `all` privileges to alerts for a rule type.

### `read` privileges vs. `all` privileges
When a user is granted the `read` role in the Alerting Framework, they will be able to execute the following api calls:

- `get`
- `getRuleState`
- `getAlertSummary`
- `getExecutionLog`
- `getExecutionErrors`
- `find`

When a user is granted the `all` role in the Alerting Framework, they will be able to execute all of the `read` privileged api calls, but in addition they'll be granted the following calls:

- `create`
- `delete`
- `update`
- `enable`
- `disable`
- `updateApiKey`
- `muteAll`
- `unmuteAll`
- `muteAlert`
- `unmuteAlert`

Finally, all users, whether they're granted any role or not, are privileged to call the following:

- `listAlertTypes`, but the output is limited to displaying the rule types the user is privileged to `get`.

Attempting to execute any operation the user isn't privileged to execute will result in an Authorization error thrown by the RulesClient.

## Alert Navigation

When registering a rule type, you'll likely want to provide a way of viewing rules of that type within your own plugin, or perhaps you want to provide a view for all rules created from within your solution within your own UI.

In order for the Alerting Framework to know that your plugin has its own internal view for displaying a rule, you must register a navigation handler within the framework.

A navigation handler is nothing more than a function that receives a rule and its corresponding RuleType, and is expected to then return the path *within your plugin* which knows how to display this rule.

The signature of such a handler is:

```typescript
type AlertNavigationHandler = (
  alert: SanitizedAlert,
  alertType: RuleType
) => string;
```

There are two ways to register this handler.
By specifying _alerting_ as a dependency of your *public* (client side) plugin, you'll gain access to two apis: _alerting.registerNavigation_ and _alerting.registerDefaultNavigation_.

### registerNavigation
The _registerNavigation_ api allows you to register a handler for a specific alert type within your solution:

```typescript
alerting.registerNavigation(
	'my-application-id',
	'my-application-id.my-rule-type',
	(alert: SanitizedAlert) => `/my-unique-rule/${rule.id}`
);
```

This tells the Alerting Framework that, given a rule of the RuleType whose ID is `my-application-id.my-unique-rule-type`, if that rule's `consumer` value (which is set when the rule is created by your plugin) is your application (whose id is `my-application-id`), then it will navigate to your application using the path `/my-unique-rule/${the id of the rule}`.

The navigation is handled using the `navigateToApp` API, meaning that the path will be automatically picked up by your `react-router-dom` **Route** component, so all you have top do is configure a Route that handles the path `/my-unique-rule/:id`.

You can look at the `alerting-example` plugin to see an example of using this API, which is enabled using the `--run-examples` flag when you run `yarn start`.

### registerDefaultNavigation
The _registerDefaultNavigation_ API allows you to register a handler for any rule type within your solution:

```
alerting.registerDefaultNavigation(
	'my-application-id',
	(alert: SanitizedAlert) => `/my-other-rules/${rule.id}`
);
```

This tells the Alerting Framework that any rule whose `consumer` value is your application can be navigated to in your application using the path `/my-other-rules/${the id of the rule}`.

### Balancing both APIs side by side
As we mentioned, using `registerDefaultNavigation` will tell the Alerting Framework that your application can handle any type of rule we throw at it, as long as your application created it, using the handler you provided.

The only case in which this handler will not be used to evaluate the navigation for a rule (assuming your application is the `consumer`) is if you have also used the `registerNavigation` API, alongside your `registerDefaultNavigation` usage, to handle that rule's specific RuleType.

You can use the `registerNavigation` API to specify as many RuleType specific handlers as you like, but you can only use it once per RuleType as we wouldn't know which handler to use if you specified two for the same RuleType. For the same reason, you can only use `registerDefaultNavigation` once per plugin, as it covers all cases for your specific plugin.

## Internal HTTP APIs

We provide public APIs for performing CRUD operations on rules. Descriptions for these APIs are available in the [user documentation](https://www.elastic.co/guide/en/kibana/master/alerting-apis.html).
In addition to the public APIs, we provide the following internal APIs. Internal APIs should not be consumed by plugins outside of the alerting plugins.

### `GET /internal/alerting/rule/{id}/state`: Get rule state

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the rule whose state you're trying to get.|string|

### `GET /internal/alerting/rule/{id}/_alert_summary`: Get rule alert summary

Similar to the `GET state` call, but collects additional information from
the event log.

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the rule whose alert summary you're trying to get.|string|

Query:

|Property|Description|Type|
|---|---|---|
|dateStart|The date to start looking for alert events in the event log. Either an ISO date string, or a duration string indicating time since now.|string|

### `POST /internal/alerting/rule/{id}/_update_api_key`: Update rule API key

|Property|Description|Type|
|---|---|---|
|id|The id of the rule you're trying to update the API key for. System will use user in request context to generate an API key for.|string|

## Alert Factory

**alertFactory.create(id)**

One service passed in to each rule type is the alert factory. This factory creates alerts and must be used in order to schedule action execution. The `id` you give to the alert factory create fn() is the unique identifier for the alert (e.g. the server identifier if the alert is about servers). The alert factory will use this identifier to retrieve the state of previous alerts with the same `id`. These alerts support persisting state between rule executions, but will clear out once the alert stops firing.

Note that the `id` only needs to be unique **within the scope of a specific rule**, not unique across all rules or rule types. For example, Rule 1 and Rule 2 can both create an alert with an `id` of `"a"` without conflicting with one another. But if Rule 1 creates 2 alerts, then they must be differentiated with `id`s of `"a"` and `"b"`.

This factory returns an instance of `Alert`. The `Alert` class has the following methods. Note that we have removed the methods that you shouldn't touch.

|Method|Description|
|---|---|
|getState()|Get the current state of the alert.|
|scheduleActions(actionGroup, context)|Call this to schedule the execution of actions. The actionGroup is a string `id` that relates to the group of alert `actions` to execute and the context will be used for templating purposes. `scheduleActions` or `scheduleActionsWithSubGroup` should only be called once per alert.|
|scheduleActionsWithSubGroup(actionGroup, subgroup, context)|Call this to schedule the execution of actions within a subgroup. The actionGroup is a string `id` that relates to the group of alert `actions` to execute, the `subgroup` is a dynamic string that denotes a subgroup within the actionGroup and the context will be used for templating purposes. `scheduleActions` or `scheduleActionsWithSubGroup` should only be called once per alert.|
|replaceState(state)|Used to replace the current state of the alert. This doesn't work like React, the entire state must be provided. Use this feature as you see fit. The state that is set will persist between rule executions whenever you re-create an alert with the same id. The alert state will be erased when `scheduleActions` or `scheduleActionsWithSubGroup` aren't called during an execution.|
|setContext(context)|Call this to set the context for this alert that is used for templating purposes.

### When should I use `scheduleActions` and `scheduleActionsWithSubGroup`?
The `scheduleActions` or `scheduleActionsWithSubGroup` methods are both used to achieve the same thing: schedule actions to be run under a specific action group.
It's important to note that when actions are scheduled for an alert, we check whether the alert was already active in this action group after the previous execution. If it was, then we might throttle the actions (adhering to the user's configuration), as we don't consider this a change in the alert.

What happens though, if the alert _has_ changed, but they just happen to be in the same action group after this change? This is where subgroups come in. By specifying a subgroup (using the `scheduleActionsWithSubGroup` method), the alert becomes active within the action group, but it will also keep track of the subgroup.
If the subgroup changes, then the framework will treat the alert as if it had been placed in a new action group. It is important to note that we only use the subgroup to denote a change if both the current execution and the previous one specified a subgroup.

You might wonder, why bother using a subgroup if you can just add a new action group?
Action Groups are static, and have to be define when the rule type is defined.
Action Subgroups are dynamic, and can be defined on the fly.

This approach enables users to specify actions under specific action groups, but they can't specify actions that are specific to subgroups.
As subgroups fall under action groups, we will schedule the actions specified for the action group, but the subgroup allows the RuleType implementer to reuse the same action group for multiple different active subgroups.

### When should I use `setContext`?
`setContext` is intended to be used for setting context for recovered alerts. While rule type executors make the determination as to which alerts are active for an execution, the Alerting Framework automatically determines which alerts are recovered for an execution. `setContext` empowers rule type executors to provide additional contextual information for these recovered alerts that will be templated into actions.

## Templating Actions

There needs to be a way to map rule context into action parameters. For this, we started off by adding template support. Any string within the `params` of a rule saved object's `actions` will be processed as a template and can inject context or state values.

When an alert executes, the first argument is the `group` of actions to execute and the second is the context the rule exposes to templates. We iterate through each action parameter attributes recursively and render templates if they are a string. Templates have access to the following "variables":

- `context` - provided by context argument of `.scheduleActions(...)`, `.scheduleActionsWithSubGroup(...)` and `setContext(...)` on an alert.
- `state` - the alert's `state` provided by the most recent `replaceState` call on an alert.
- `alertId` - the id of the rule
- `alertInstanceId` - the alert id
- `alertName` - the name of the rule
- `spaceId` - the id of the space the rule exists in
- `tags` - the tags set in the rule

The templating engine is [mustache]. General definition for the [mustache variable] is a double-brace {{}}. All variables are HTML-escaped by default and if there is a requirement to render unescaped HTML, it should be applied with the triple mustache: `{{{name}}}`. Also, `&` can be used to unescape a variable.

### Examples

The following code would be within a rule type. As you can see `cpuUsage` will replace the state of the alert and `server` is the context for the alert to execute. The difference between the two is that `cpuUsage` will be accessible at the next execution.

```
alertFactory
  .create('server_1')
  .replaceState({
    cpuUsage: 80,
  })
  .scheduleActions('default', {
    server: 'server_1',
  });
```

Below is an example of a rule that takes advantage of templating:

```
{
  ...
  "id": "123",
  "name": "cpu rule",
  "actions": [
    {
      "group": "default",
      "id": "3c5b2bd4-5424-4e4b-8cf5-c0a58c762cc5",
      "params": {
        "from": "example@elastic.co",
        "to": ["destination@elastic.co"],
        "subject": "A notification about {{context.server}}",
        "body": "The server {{context.server}} has a CPU usage of {{state.cpuUsage}}%. This message for {{alertInstanceId}} was created by the rule {{alertId}} {{alertName}}."
      }
    }
  ]
}
```

The templating system will take the rule and rule type as described above and convert the action parameters to the following:

```
{
  "from": "example@elastic.co",
  "to": ["destination@elastic.co"],
  "subject": "A notification about server_1"
  "body": "The server server_1 has a CPU usage of 80%. This message for server_1 was created by the rule 123 cpu rule"
}
```

There are limitations that we are aware of using only templates, and we are gathering feedback and use cases for these. (for example passing an array of strings to an action).

[mustache]: https://github.com/janl/mustache.js
[mustache variable]: https://github.com/janl/mustache.js#variables
