# Kibana alerting

The Kibana alerting plugin provides a common place to set up alerts. You can:

- Register types of alerts
- List the types of registered alerts
- Perform CRUD actions on alerts

----

Table of Contents

- [Kibana alerting](#kibana-alerting)
	- [Terminology](#terminology)
	- [Usage](#usage)
	- [Alerts API keys](#alerts-api-keys)
	- [Plugin status](#plugin-status)
	- [Alert types](#alert-types)
		- [Methods](#methods)
		- [Executor](#executor)
		- [Action variables](#action-variables)
	- [Licensing](#licensing)
	- [Documentation](#documentation)
	- [Tests](#tests)
		- [Example](#example)
	- [Role Based Access-Control](#role-based-access-control)
	- [Alert Navigation](#alert-navigation)
	- [Experimental RESTful API](#restful-api)
		- [`GET /api/alerts/alert/{id}/state`: Get alert state](#get-apialertidstate-get-alert-state)
		- [`GET /api/alerts/alert/{id}/_instance_summary`: Get alert instance summary](#get-apialertidstate-get-alert-instance-summary)
		- [`POST /api/alerts/alert/{id}/_update_api_key`: Update alert API key](#post-apialertidupdateapikey-update-alert-api-key)
	- [Alert instance factory](#alert-instance-factory)
	- [Templating actions](#templating-actions)
		- [Examples](#examples)


## Terminology

**Alert Type**: A function that takes parameters and executes actions to alert instances.

**Alert**: A configuration that defines a schedule, an alert type w/ parameters, state information and actions.

**Alert Instance**: The instance(s) created from an alert type execution.

A Kibana alert detects a condition and executes one or more actions when that condition occurs.  Alerts work by going through the followings steps:

1. Run a periodic check to detect a condition (the check is provided by an Alert Type) 
2. Convert that condition into one or more stateful Alert Instances
3. Map Alert Instances to pre-defined Actions, using templating
4. Execute the Actions

## Usage

1. Develop and register an alert type (see alert types -> example).
2. Configure feature level privileges using RBAC 
3. Create an alert using the RESTful API [Documentation](https://www.elastic.co/guide/en/kibana/master/alerts-api-update.html) (see alerts -> create).

## Alerts API keys

When we create an alert, we generate a new API key.

When we update, enable, or disable an alert, we must invalidate the old API key and create a new one.

To manage the invalidation process for API keys, we use the saved object `api_key_pending_invalidation`.  This object stores all API keys that were marked for invalidation when alerts were updated.
For security plugin invalidation, we schedule a task to check if the`api_key_pending_invalidation` saved object contains new API keys that are marked for invalidation earlier than the configured delay.  The default value for running the task is 5 mins.
To change the schedule for the invalidation task, use the kibana.yml configuration option `xpack.alerting.invalidateApiKeysTask.interval`.
To change the default delay for the API key invalidation, use the kibana.yml configuration option `xpack.alerting.invalidateApiKeysTask.removalDelay`.

## Plugin status

The plugin status of an alert is customized by including information about checking failures for the framework decryption:
```
core.status.set(
        combineLatest([
          core.status.derivedStatus$,
          getHealthStatusStream(startPlugins.taskManager),
        ]).pipe(
          map(([derivedStatus, healthStatus]) => {
            if (healthStatus.level > derivedStatus.level) {
              return healthStatus as ServiceStatus;
            } else {
              return derivedStatus;
            }
          })
        )
      );
```
To check for framework decryption failures, we use the task `alerting_health_check`, which runs every 60 minutes by default. To change the default schedule, use the kibana.yml configuration option `xpack.alerting.healthCheck.interval`.

## Alert types

### Methods

**server.newPlatform.setup.plugins.alerting.registerType(options)**

The following table describes the properties of the `options` object.

|Property|Description|Type|
|---|---|---|
|id|Unique identifier for the alert type. For convention purposes, ids starting with `.` are reserved for built in alert types. We recommend using a convention like `<plugin_id>.mySpecialAlert` for your alert types to avoid conflicting with another plugin.|string|
|name|A user-friendly name for the alert type. These will be displayed in dropdowns when choosing alert types.|string|
|actionGroups|An explicit list of groups the alert type may schedule actions for, each specifying the ActionGroup's unique ID and human readable name. Alert `actions` validation will use this configuartion to ensure groups are valid. We highly encourage using `kbn-i18n` to translate the names of actionGroup  when registering the AlertType. |Array<{id:string, name:string}>|
|defaultActionGroupId|Default ID value for the group of the alert type.|string|
|recoveryActionGroup|An action group to use when an alert instance goes from an active state, to an inactive one. This action group should not be specified under the `actionGroups` property. If no recoveryActionGroup is specified, the default `recovered` action group will be used. |{id:string, name:string}|
|actionVariables|An explicit list of action variables the alert type makes available via context and state in action parameter templates, and a short human readable description. Alert UI  will use this to display prompts for the users for these variables, in action parameter editors. We highly encourage using `kbn-i18n` to translate the descriptions. |{ context: Array<{name:string, description:string}, state: Array<{name:string, description:string}>|
|validate.params|When developing an alert type, you can choose to accept a series of parameters. You may also have the parameters validated before they are passed to the `executor` function or created as an alert saved object. In order to do this, provide a `@kbn/config-schema` schema that we will use to validate the `params` attribute.|@kbn/config-schema|
|executor|This is where the code of the alert type lives. This is a function to be called when executing an alert on an interval basis. For full details, see executor section below.|Function|
|producer|The id of the application producing this alert type.|string|
|minimumLicenseRequired|The value of a minimum license. Most of the alerts are licensed as "basic".|string|

### Executor

This is the primary function for an alert type. Whenever the alert needs to execute, this function will perform the execution. It receives a variety of parameters. The following table describes the properties the executor receives.

**executor(options)**

|Property|Description|
|---|---|
|services.scopedClusterClient|This is an instance of the Elasticsearch client. Use this to do Elasticsearch queries in the context of the user who created the alert when security is enabled.|
|services.savedObjectsClient|This is an instance of the saved objects client. This provides the ability to do CRUD on any saved objects within the same space the alert lives in.<br><br>The scope of the saved objects client is tied to the user who created the alert (only when security isenabled).|
|services.alertInstanceFactory(id)|This [alert instance factory](#alert-instance-factory) creates instances of alerts and must be used in order to execute actions. The id you give to the alert instance factory is a unique identifier to the alert instance.|
|services.log(tags, [data], [timestamp])|Use this to create server logs. (This is the same function as server.log)|
|startedAt|The date and time the alert type started execution.|
|previousStartedAt|The previous date and time the alert type started a successful execution.|
|params|Parameters for the execution. This is where the parameters you require will be passed in. (example threshold). Use alert type validation to ensure values are set before execution.|
|state|State returned from previous execution. This is the alert level state. What the executor returns will be serialized and provided here at the next execution.|
|alertId|The id of this alert.|
|spaceId|The id of the space of this alert.|
|namespace|The namespace of the space of this alert; same as spaceId, unless spaceId === 'default', then namespace = undefined.|
|name|The name of this alert.|
|tags|The tags associated with this alert.|
|createdBy|The userid that created this alert.|
|updatedBy|The userid that last updated this alert.|

### Action Variables

The `actionVariables` property should contain the **flattened** names of the state and context variables available when an executor calls `alertInstance.scheduleActions(actionGroup, context)`.  These names are meant to be used in prompters in the alerting user interface, are used as text values for display, and can be inserted into to an action parameter text entry field via UI gesture (eg, clicking a menu item from a menu built with these names).  They should be flattened,  so if a state or context variable is an object with properties, these should be listed with the "parent" property/properties in the name, separated by a `.` (period).

For example, if the `context` has one variable `foo` which is an object that has one property `bar`, and there are no `state` variables, the `actionVariables` value would be in the following shape:

```js
{
	context: [
		{ name: 'foo.bar', description: 'the ultra-exciting bar property' },
	]
}
```

## Licensing

Currently most of the alerts are free features. But some alert types are subscription features, such as the tracking containment alert.

## Documentation

You should create asciidoc for the new alert type. 
* For stack alerts, add an entry to the alert type index - [`docs/user/alerting/alert-types.asciidoc`](../../../docs/user/alerting/alert-types.asciidoc) which points to a new document for the alert type that should be in the directory [`docs/user/alerting/stack-alerts`](../../../docs/user/alerting/stack-alerts).

* Solution specific alert documentation should live within the docs for the solution. 

We suggest following the template provided in `docs/alert-type-template.asciidoc`. The [Index Threshold alert type](https://www.elastic.co/guide/en/kibana/master/alert-type-index-threshold.html) is an example of documentation created following the template.

## Tests

The alert type should have jest tests and optionaly functional tests. 
In the the tests we recomend to test the expected alert execution result with a different input params, the structure of the created alert and the params validation. The rest will be guaranteed as a framework functionality.

### Example

This example receives server and threshold as parameters. It will read the CPU usage of the server and schedule actions to be executed (asynchronously by the task manager) if the reading is greater than the threshold.

```typescript
import { schema } from '@kbn/config-schema';
import { AlertType, AlertExecutorOptions } from '../../../alerting/server';
import {
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
} from '../../../alerting/common';
...
interface MyAlertTypeParams extends AlertTypeParams {
	server: string;
	threshold: number;
}

interface MyAlertTypeState extends AlertTypeState {
	lastChecked: Date;
}

interface MyAlertTypeInstanceState extends AlertInstanceState {
	cpuUsage: number;
}

interface MyAlertTypeInstanceContext extends AlertInstanceContext {
	server: string;
	hasCpuUsageIncreased: boolean;
}

type MyAlertTypeActionGroups = 'default' | 'warning';
  
const myAlertType: AlertType<
	MyAlertTypeParams,
	MyAlertTypeState,
	MyAlertTypeInstanceState,
	MyAlertTypeInstanceContext,
	MyAlertTypeActionGroups
> = {
	id: 'my-alert-type',
	name: 'My alert type',
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
	async executor({
    alertId,
		startedAt,
		previousStartedAt,
		services,
		params,
		state,
	}: AlertExecutorOptions<MyAlertTypeParams, MyAlertTypeState, MyAlertTypeInstanceState, MyAlertTypeInstanceContext, MyAlertTypeActionGroups>) {
		// Let's assume params is { server: 'server_1', threshold: 0.8 }
		const { server, threshold } = params;

		// Call a function to get the server's current CPU usage
		const currentCpuUsage = await getCpuUsage(server);

		// Only execute if CPU usage is greater than threshold
		if (currentCpuUsage > threshold) {
			// The first argument is a unique identifier the alert instance is about. In this scenario
			// the provided server will be used. Also, this id will be used to make `getState()` return
			// previous state, if any, on matching identifiers.
			const alertInstance = services.alertInstanceFactory(server);

			// State from last execution. This will exist if an alert instance was created and executed
			// in the previous execution
			const { cpuUsage: previousCpuUsage } = alertInstance.getState();

			// Replace state entirely with new values
			alertInstance.replaceState({
				cpuUsage: currentCpuUsage,
			});

			// 'default' refers to the id of a group of actions to be scheduled for execution, see 'actions' in create alert section
			alertInstance.scheduleActions('default', {
				server,
				hasCpuUsageIncreased: currentCpuUsage > previousCpuUsage,
			});
		}

		// Returning updated alert type level state, this will become available
		// within the `state` function parameter at the next execution
		return {
			// This is an example attribute you could set, it makes more sense to use this state when
			// the alert type executes multiple instances but wants a single place to track certain values.
			lastChecked: new Date(),
		};
	},
	producer: 'alerting',
};

server.newPlatform.setup.plugins.alerting.registerType(myAlertType);
```

## Role Based Access-Control
Once you have registered your AlertType, you need to grant your users privileges to use it.
When registering a feature in Kibana you can specify multiple types of privileges which are granted to users when they're assigned certain roles.

Assuming your feature introduces its own AlertTypes, you'll want to control which roles have all/read privileges for these AlertTypes when they're inside the feature.
In addition, when users are inside your feature you might want to grant them access to AlertTypes from other features, such as built-in AlertTypes or AlertTypes provided by other features.

You can control all of these abilities by assigning privileges to the Alerting Framework from within your own feature, for example:

```typescript
features.registerKibanaFeature({
	id: 'my-application-id',
	name: 'My Application',
	app: [],
	privileges: {
		all: {
			alerting: {
				all: [
					// grant `all` over our own types
					'my-application-id.my-alert-type',
					'my-application-id.my-restricted-alert-type',
					// grant `all` over the built-in IndexThreshold
					'.index-threshold',
					// grant `all` over Uptime's TLS AlertType
					'xpack.uptime.alerts.actionGroups.tls'
				],
			},
		},
		read: {
			alerting: {
				read: [
					// grant `read` over our own type
					'my-application-id.my-alert-type',
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
When a user is granted the `read` role in the Alerting Framework, they will be able to execute the following api calls:
- `get`
- `getAlertState`
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
- `muteInstance`
- `unmuteInstance`

Finally, all users, whether they're granted any role or not, are privileged to call the following:
- `listAlertTypes`, but the output is limited to displaying the AlertTypes the user is perivileged to `get`

Attempting to execute any operation the user isn't privileged to execute will result in an Authorization error thrown by the AlertsClient.

## Alert Navigation
When registering an Alert Type, you'll likely want to provide a way of viewing alerts of that type within your own plugin, or perhaps you want to provide a view for all alerts created from within your solution within your own UI.

In order for the Alerting framework to know that your plugin has its own internal view for displaying an alert, you must resigter a navigation handler within the framework.

A navigation handler is nothing more than a function that receives an Alert and its corresponding AlertType, and is expected to then return the path *within your plugin* which knows how to display this alert.

The signature of such a handler is:

```
type AlertNavigationHandler = (
  alert: SanitizedAlert,
  alertType: AlertType
) => string;
```

There are two ways to register this handler.
By specifying _alerting_ as a dependency of your *public* (client side) plugin, you'll gain access to two apis: _alerting.registerNavigation_ and _alerting.registerDefaultNavigation_.

### registerNavigation
The _registerNavigation_ api allows you to register a handler for a specific alert type within your solution:

```
alerting.registerNavigation(
	'my-application-id',
	'my-application-id.my-alert-type',
	(alert: SanitizedAlert, alertType: AlertType) => `/my-unique-alert/${alert.id}`
);
```

This tells the Alerting framework that, given an alert of the AlertType whose ID is `my-application-id.my-unique-alert-type`, if that Alert's `consumer` value (which is set when the alert is created by your plugin) is your application (whose id is `my-application-id`), then it will navigate to your application using the path `/my-unique-alert/${the id of the alert}`.

The navigation is handled using the `navigateToApp` api, meaning that the path will be automatically picked up by your `react-router-dom` **Route** component, so all you have top do is configure a Route that handles the path `/my-unique-alert/:id`.

You can look at the `alerting-example` plugin to see an example of using this API, which is enabled using the `--run-examples` flag when you run `yarn start`.

### registerDefaultNavigation
The _registerDefaultNavigation_ api allows you to register a handler for any alert type within your solution:

```
alerting.registerDefaultNavigation(
	'my-application-id',
	(alert: SanitizedAlert, alertType: AlertType) => `/my-other-alerts/${alert.id}`
);
```

This tells the Alerting framework that, given any alert whose `consumer` value is your application, as long as  then it will navigate to your application using the path `/my-other-alerts/${the id of the alert}`.

### balancing both APIs side by side
As we mentioned, using `registerDefaultNavigation` will tell the Alerting Framework that your application can handle any type of Alert we throw at it, as long as your application created it, using the handler you provide it.

The only case in which this handler will not be used to evaluate the navigation for an alert (assuming your application is the `consumer`) is if you have also used `registerNavigation` api, along side your `registerDefaultNavigation` usage, to handle that alert's specific AlertType.

You can use the `registerNavigation` api to specify as many AlertType specific handlers as you like, but you can only use it once per AlertType as we wouldn't know which handler to use if you specified two for the same AlertType. For the same reason, you can only use `registerDefaultNavigation` once per plugin, as it covers all cases for your specific plugin.

## Experimental RESTful API

Using of the alert type requires you to create an alert that will contain parameters and actions for a given alert type. API description for CRUD operations is a part of the [user documentation](https://www.elastic.co/guide/en/kibana/master/alerts-api-update.html).
API listed below is experimental and could be changed or removed in the future.

### `GET /api/alerts/alert/{id}/state`: Get alert state

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the alert whose state you're trying to get.|string|

### `GET /api/alerts/alert/{id}/_instance_summary`: Get alert instance summary

Similar to the `GET state` call, but collects additional information from
the event log.

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the alert whose instance summary you're trying to get.|string|

Query:

|Property|Description|Type|
|---|---|---|
|dateStart|The date to start looking for alert events in the event log. Either an ISO date string, or a duration string indicating time since now.|string|

### `POST /api/alerts/alert/{id}/_update_api_key`: Update alert API key

|Property|Description|Type|
|---|---|---|
|id|The id of the alert you're trying to update the API key for. System will use user in request context to generate an API key for.|string|

## Alert instance factory

**alertInstanceFactory(id)**

One service passed in to alert types is an alert instance factory. This factory creates instances of alerts and must be used in order to execute actions. The `id` you give to the alert instance factory is a unique identifier to the alert instance (ex: server identifier if the instance is about the server). The instance factory will use this identifier to retrieve the state of previous instances with the same `id`. These instances support state persisting between alert type execution, but will clear out once the alert instance stops executing.

Note that the `id` only needs to be unique **within the scope of a specific alert**, not unique across all alerts or alert types. For example, Alert 1 and Alert 2 can both create an alert instance with an `id` of `"a"` without conflicting with one another. But if Alert 1 creates 2 alert instances, then they must be differentiated with `id`s of `"a"` and `"b"`.

This factory returns an instance of `AlertInstance`. The alert instance class has the following methods, note that we have removed the methods that you shouldn't touch.

|Method|Description|
|---|---|
|getState()|Get the current state of the alert instance.|
|scheduleActions(actionGroup, context)|Called to schedule the execution of actions. The actionGroup is a string `id` that relates to the group of alert `actions` to execute and the context will be used for templating purposes. `scheduleActions` or `scheduleActionsWithSubGroup` should only be called once per alert instance.|
|scheduleActionsWithSubGroup(actionGroup, subgroup, context)|Called to schedule the execution of actions within a subgroup. The actionGroup is a string `id` that relates to the group of alert `actions` to execute, the `subgroup` is a dynamic string that denotes a subgroup within the actionGroup and the context will be used for templating purposes. `scheduleActions` or `scheduleActionsWithSubGroup` should only be called once per alert instance.|
|replaceState(state)|Used to replace the current state of the alert instance. This doesn't work like react, the entire state must be provided. Use this feature as you see fit. The state that is set will persist between alert type executions whenever you re-create an alert instance with the same id. The instance state will be erased when `scheduleActions` or `scheduleActionsWithSubGroup` aren't called during an execution.|

### when should I use `scheduleActions` and `scheduleActionsWithSubGroup`?
The `scheduleActions` or `scheduleActionsWithSubGroup` methods are both used to achieve the same thing: schedule actions to be run under a specific action group.
It's important to note though, that when an actions are scheduled for an instance, we check whether the instance was already active in this action group after the previous execution. If it was, then we might throttle the actions (adhering to the user's configuration), as we don't consider this a change in the instance.

What happens though, if the instance _has_ changed, but they just happen to be in the same action group after this change? This is where subgroups come in. By specifying a subgroup (using the `scheduleActionsWithSubGroup` method), the instance becomes active within the action group, but it will also keep track of the subgroup.
If the subgroup changes, then the framework will treat the instance as if it had been placed in a new action group. It is important to note though, we only use the subgroup to denote a change if both the current execution and the previous one specified a subgroup.

You might wonder, why bother using a subgroup if you can just add a new action group?
Action Groups are static, and have to be define when the Alert Type is defined.
Action Subgroups are dynamic, and can be defined on the fly.

This approach enables users to specify actions under specific action groups, but they can't specify actions that are specific to subgroups.
As subgroups fall under action groups, we will schedule the actions specified for the action group, but the subgroup allows the AlertType implementer to reuse the same action group for multiple different active subgroups.

## Templating actions

There needs to be a way to map alert context into action parameters. For this, we started off by adding template support. Any string within the `params` of an alert saved object's `actions` will be processed as a template and can inject context or state values. 

When an alert instance executes, the first argument is the `group` of actions to execute and the second is the context the alert exposes to templates. We iterate through each action params attributes recursively and render templates if they are a string. Templates have access to the following "variables":

- `context` - provided by context argument of `.scheduleActions(...)` and `.scheduleActionsWithSubGroup(...)` on an alert instance
- `state` - the alert instance's `state` provided by the most recent `replaceState` call on an alert instance
- `alertId` - the id of the alert
- `alertInstanceId` - the alert instance id
- `alertName` - the name of the alert
- `spaceId` - the id of the space the alert exists in
- `tags` - the tags set in the alert

The templating engine is [mustache]. General definition for the [mustache variable] is a double-brace {{}}. All variables are HTML-escaped by default and if there is a requirement to render unescaped HTML, it should be applied the triple mustache: `{{{name}}}`. Also, can be used `&` to unescape a variable.

### Examples

The following code would be within an alert type. As you can see `cpuUsage ` will replace the state of the alert instance and `server` is the context for the alert instance to execute. The difference between the two is `cpuUsage ` will be accessible at the next execution.

```
alertInstanceFactory('server_1')
  .replaceState({
    cpuUsage: 80,
  })
  .scheduleActions('default', {
    server: 'server_1',
  });
```

Below is an example of an alert that takes advantage of templating:

```
{
  ...
  "id": "123",
  "name": "cpu alert",
  "actions": [
    {
      "group": "default",
      "id": "3c5b2bd4-5424-4e4b-8cf5-c0a58c762cc5",
      "params": {
        "from": "example@elastic.co",
        "to": ["destination@elastic.co"],
        "subject": "A notification about {{context.server}}",
        "body": "The server {{context.server}} has a CPU usage of {{state.cpuUsage}}%. This message for {{alertInstanceId}} was created by the alert {{alertId}} {{alertName}}."
      }
    }
  ]
}
```

The templating system will take the alert and alert type as described above and convert the action parameters to the following:

```
{
  "from": "example@elastic.co",
  "to": ["destination@elastic.co"],
  "subject": "A notification about server_1"
  "body": "The server server_1 has a CPU usage of 80%. This message for server_1 was created by the alert 123 cpu alert"
}
```

There are limitations that we are aware of using only templates, and we are gathering feedback and use cases for these. (for example passing an array of strings to an action).

[mustache]: https://github.com/janl/mustache.js
[mustache variable]: https://github.com/janl/mustache.js#variables
