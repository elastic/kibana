# Notification Service / Actions

Use this service to send notifications to users. An example of a notification is sending an email or
explicitly adding something to the Kibana log.

Notifications are inherently asynchronous actions because of the likelihood that any notification is
interacting with a remote server or service.

## Referencing the Notification Service

Note: Both of these may change in the future.

### Server Side

```js
const notificationService = server.plugins.notifications.notificationService;

const action = notificationService.getActionForId('xpack-notifications-logger');
const result = action.performAction({
  arbitrary: 'payload',
  can: 'have multiple',
  fields: [ 1, 2, 3 ]
});
```

### HTTP

```http
POST /api/notifications/v1/notify
{
  "action": "xpack-notifications-logger",
  "data": {
    "arbitrary": "payload",
    "can": "have multiple",
    "fields": [ 1, 2, 3 ]
  }
}
```

## Interfaces

There are two interfaces that are important from this package. `NotificationService`, which is exposed as
a singleton from the plugin: `server.plugins.notifications.notificationService`. And `Action`, which
provides an abstract Javascript `class` to implement new `Action`s.

### NotificationService Interface

The `NotificationService` currently has four methods defined with very distinct purposes:

1. `setAction` is intended for plugin authors to add actions that do not exist with the basic notifications
service.
2. `removeAction` is intended for replacing existing plugins (e.g., augmenting another action).
3. `getActionForId` enables explicitly fetching an action by its known ID.
4. `getActionsForData` enables discovering compatible actions given an arbitrary set of data.

Note: Mutating the Notification Service should generally only be done based on very specific reasons,
such as plugin initialization or the user dynamically configuring a service's availability (e.g.,
if we support a secure data store, the user could theoretically provide authentication details for an email
server).

It is also possible that the user will want to configure multiple variants of the same action, such as
multiple email notifications with differing defaults. In that case, the action's ID may need to be
reconsidered.

#### `setAction()`

This is the only way to add an `Action` instance. Instances are expected to be extensions of the `Action`
class defined here. If the provided action already exists, then the old one is removed.

##### Syntax

```js
notificationService.setAction(action);
```

###### Parameters

| Field | Type | Description |
|-------|------|-------------|
| `action` | Action | The unique action to support. |

###### Returns

Nothing.

##### Example

Create a simple logging action that can be triggered generically.

```js
class LoggerAction extends Action {

  constructor({ server }) {
    super({ server, id: 'xpack-notifications-logger', name: 'Log' });
  }

  getMissingFields() {
    return [];
  }

  async doPerformHealthCheck() {
    return new ActionResult({
      message: `Logger action is always usable.`,
      response: { },
    });
  }

  async doPerformAction(notification) {
    this.server.log(['logger', 'info'], notification);

    return new ActionResult({
      message: 'Logged data returned as response.',
      response: notification
    });
  }

}

// It's possible that someone may choose to make the LoggerAction's log level configurable, so
// replacing it could be done by re-setting it, which means any follow-on usage would use the new level
// (or, possibly, you could create different actions entirely for different levels)
notificationService.setAction(new LoggerAction({ server }));
```

#### `removeAction()`

Remove an action that has been set.

##### Syntax

```js
const action = notificationService.removeAction(actionId);
```

###### Parameters

| Field | Type | Description |
|-------|------|-------------|
| `id`  | String | ID of the action to remove. |

###### Returns

| Type | Description |
|------|-------------|
| Action \| null | The action that was removed. `null` otherwise. |

##### Example

```js
const action = notificationService.removeAction('xpack-notifications-logger');

if (action !== null) {
  // removed; otherwise it didn't exist (maybe it was already removed)
}
```

#### `getActionForId()`

Retrieve a specific `Action` from the Notification Service.

##### Syntax

```js
const action = notificationService.getActionForId(actionId);
```

###### Parameters

| Field | Type | Description |
|-------|------|-------------|
| `id`  | String | ID of the action to retrieve. |

###### Returns

| Type | Description |
|------|-------------|
| Action \| null | The action that was requested. `null` otherwise. |

##### Example

```js
// In this case, the ID is known from the earlier example
const action = notificationService.getActionForId('xpack-notifications-logger');

if (action !== null) {
  // otherwise it didn't exist
}
```

#### `getActionsForData()`

Retrieve any `Action`s from the Notification Service that accept the supplied data, which is useful for
discovery.

##### Syntax

```js
const actions = notificationService.getActionsForData(notification);
```

###### Parameters

| Field | Type | Description |
|-------|------|-------------|
| `notification` | Object | Payload to send notification. |

###### Returns

| Type | Description |
|------|-------------|
| Action[] | The actions that accept a subset of the data. Empty array otherwise. |

##### Example

```js
// In this case, the ID is known from the earlier example
const actions = notificationService.getActionsForData({
  arbitrary: 'payload',
  can: 'have multiple',
  fields: [ 1, 2, 3 ]
});

if (action.length !== 0) {
  // otherwise nothing matches
}
```

### Action Interface

From the perspective of developers that want to make use of `Action`s, there are three relevant methods:

1. `getMissingFields` provides an array of fields as well as the expected data type that did not exist in the
supplied data.
2. `performHealthCheck` attempts to perform a health check against the actions backing service.
3. `performAction` attempts to perform the purpose of the action (e.g., send the email) using the supplied
data.

For developers to create new `Action`s, there are three related methods:

1. `getMissingFields` provides an array of fields as well as the expected data type that did not exist in the
supplied data.
2. `doPerformHealthCheck` attempts to perform a health check against the actions backing service.
    - `performHealthCheck` invokes this method and wraps it in order to catch `Error`s.
3. `doPerformAction` attempts to perform the purpose of the action (e.g., send the email) using the supplied
data.
    - `performAction` invokes this method and wraps it in order to catch `Error`s.

Every method, excluding `getMissingFields`, is asynchronous.

#### `getMissingFields()`

This method enables the building of "Sharing"-style UIs that allow the same payload to be shared across
many different actions. This is the same approach taken in iOS and Android sharing frameworks.

##### Syntax

```js
action.getMissingFields({
  arbitrary: 'payload',
  can: 'have multiple',
  fields: [ 1, 2, 3 ]
});
```

###### Parameters

| Field | Type | Description |
|-------|------|-------------|
| `notification` | Object | The data that you want to try to use with the action. |

###### Returns

| Type | Description |
|------|-------------|
| Object[] | The fields that were not present in the `notification` object. Empty array otherwise. |

The object definition should match:

| Field | Type | Description |
|-------|------|-------------|
| `field` | String | The JSON field name that was expected. |
| `name` | String | The user-readable name of the field (e.g., for a generated UI). |
| `type` | String | The type of data (`email`, `text`, `markdown`, `number`, `date`, `boolean`). |

NOTE: This method _never_ throws an `Error`.

##### Example

Create a simple action whose fields can be checked automatically.

```js
// Action Users
const action = notificationService.getActionForId(actionId);
const fields = action.getMissingFields({
  arbitrary: 'payload',
  can: 'have multiple',
  fields: [ 1, 2, 3 ]
});

if (fields.length !== 0) {
  // there's some fields missing so this action should not be used yet
}

// Action Creators
class FakeAction extends Action {

  constructor({ server, defaults = { } }) {
    super({ server, id: 'xpack-notifications-fake', name: 'Fake' });

    this.defaults = defaults;
  }

  getMissingFields(notification) {
    const missingFields = [];

    if (!Boolean(this.defaults.to) && !Boolean(notification.to)) {
      missingFields.push({
        field: 'to',
        name: 'To',
        type: 'email',
      });
    }

    return missingFields;
  }

  // ... other methods ...

}
```

#### `performHealthCheck()`

This method enables the health status of third party services to be polled. The current approach only allows
an `Action`'s health to be in a boolean state: either it's up and expected to work, or it's down.

The health check is interesting because some third party services that we anticipate supporting are
inherently untrustworthy when it comes to supporting health checks (e.g., email servers). Therefore, it
should not be expected that the health check will block usage of actions -- only provide feedback to the
user, which we can ideally provide in a future notification center within the UI.

##### Syntax

```js
const result = await action.performHealthCheck();
```

###### Parameters

None.

###### Returns

| Type | Description |
|------|-------------|
| ActionResult | The result of the health check. |

An `ActionResult` defines a few methods:

| Method | Type | Description |
|-------|------|-------------|
| `isOk()` | Boolean | `true` if there was no error and it is believed to be "up". |
| `getError()` | Object \| undefined | JSON error object. |
| `getResponse()` | Object \| undefined | JSON response from the server. If the server returns a field, it should be wrapped. |
| `getMessage()` | String | Human readable message describing the state. |

NOTE: This method _never_ throws an `Error`.

##### Example

Create a simple action whose fields can be checked automatically.

```js
const action = notificationService.getActionForId(actionId);
const result = await action.performHealthCheck();

if (result.isOk()) {
  // theoretically the action is in a usable state
} else {
  // theoretically the action is not in a usable state (but some services may have broken health checks!)
}
```

#### `performAction()`

This method enables the actual usage of the `Action` for action users.

##### Syntax

```js
const result = await action.performAction({
  arbitrary: 'payload',
  can: 'have multiple',
  fields: [ 1, 2, 3 ]
});
```

###### Parameters

| Field | Type | Description |
|-------|------|-------------|
| `notification` | Object | The data that you want to try to use with the action. |

###### Returns

| Type | Description |
|------|-------------|
| ActionResult | The result of the health check. |

An `ActionResult` defines a few methods:

| Method | Type | Description |
|-------|------|-------------|
| `isOk()` | Boolean | `true` if there was no error and it is believed to be "up". |
| `getError()` | Object \| undefined | JSON error object. |
| `getResponse()` | Object \| undefined | JSON response from the server. If the server returns a field, it should be wrapped. |
| `getMessage()` | String | Human readable message describing the state. |

NOTE: This method _never_ throws an `Error`.

##### Example

Create a simple action whose fields can be checked automatically.

```js
const action = notificationService.getActionForId(actionId);
const result = await action.performAction({
  arbitrary: 'payload',
  can: 'have multiple',
  fields: [ 1, 2, 3 ]
});

if (result.isOk()) {
  // theoretically the action is in a usable state
} else {
  // theoretically the action is not in a usable state (but some services may have broken health checks!)
}
```

#### `doPerformHealthCheck()`

This method is for `Action` creators. This performs the actual work to check the health of the action's
associated service as best as possible.

This method should be thought of as a `protected` method only and it should never be called directly
outside of tests.

##### Syntax

Do not call this method directly outside of tests.

```js
const result = await action.doPerformHealthCheck();
```

###### Parameters

None.

###### Returns

| Type | Description |
|------|-------------|
| ActionResult | The result of the health check. |

An `ActionResult` defines a few methods:

| Method | Type | Description |
|-------|------|-------------|
| `isOk()` | Boolean | `true` if there was no error and it is believed to be "up". |
| `getError()` | Object \| undefined | JSON error object. |
| `getResponse()` | Object \| undefined | JSON response from the server. If the server returns a field, it should be wrapped. |
| `getMessage()` | String | Human readable message describing the state. |

NOTE: This method can throw an `Error` in lieu of returning an `ActionResult`.

##### Example

Create a simple action whose health status can be checked automatically.

```js
class FakeAction extends Action {

  constructor({ server }) {
    super({ server, id: 'xpack-notifications-fake', name: 'Fake' });
  }

  async doPerformHealthCheck() {
    // this responds with a boolean 'true' response, otherwise throws an Error
    const response = await this.transporter.verify();

    return new ActionResult({
      message: `Fake action configuration has been verified.`,
      response: {
        verified: true
      },
    });
  }

  // ... other methods ...

}
```

#### `doPerformAction()`

This method is for `Action` creators. This performs the actual function of the action.

This method should be thought of as a `protected` method only and it should never be called directly
outside of tests.

##### Syntax

Do not call this method directly outside of tests.

```js
const result = await action.doPerformAction();
```

###### Parameters

| Field | Type | Description |
|-------|------|-------------|
| `notification` | Object | The data that you want to try to use with the action. |

###### Returns

| Type | Description |
|------|-------------|
| ActionResult | The result of the health check. |

An `ActionResult` defines a few methods:

| Method | Type | Description |
|-------|------|-------------|
| `isOk()` | Boolean | `true` if there was no error and it is believed to be "up". |
| `getError()` | Object \| undefined | JSON error object. |
| `getResponse()` | Object \| undefined | JSON response from the server. If the server returns a field, it should be wrapped. |
| `getMessage()` | String | Human readable message describing the state. |

NOTE: This method can throw an `Error` in lieu of returning an `ActionResult`.

##### Example

Create a simple action whose health status can be checked automatically.

```js
class FakeAction extends Action {

  constructor({ server }) {
    super({ server, id: 'xpack-notifications-fake', name: 'Fake' });
  }

  async doPerformAction(notification) {
    // Note: This throws an Error upon failure
    const response = await this.transporter.sendMail({
      from: notification.from,
      to: notification.to,
      cc: notification.cc,
      bcc: notification.bcc,
      subject: notification.subject,
      html: notification.markdown,
      text: notification.markdown,
    });

    return new ActionResult({
      message: `Success! Sent email for '${notification.subject}'.`,
      response,
    });
  }

  // ... other methods ...

}
```
