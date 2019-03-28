# Actions service

## Overview

The actions service is a registry of supported action types and connectors. The action service allows for
users to create action instances that can be reused across Kibana. Those action instances can then be
executed by any plugin or directly by users.

## Executing Actions

Each action instance can be fired with optional action type parameter. You need
to have a defined action instance in order to fire an action.

```JS
server.actions.fire({
  action: 'send message to slack',
  actionType: 'notification',
  params: {
    message: 'This is a test message from kibana actions service',
    title: 'custom title',
    // destination: '<slack url>' // optional
  },
  // optionally handler params could be added here
  // handlerParams: {...}
})
```

The action `send message to slack` is the instance that is being fired. See
below for details how to create them

## Creating Instances

Instances are saved in the Kibana index and are used in order to `fire` an action with parameters. The
`params` required are specific to the `actionType`. Changing the `actionType` also
changes what `handlers` are available for it.


```JS
server.actions.instance({
  name: 'send message to slack',
  actionType: 'notification',
  handler: 'slack',
  params: {
    destination: '<slack url>',
  },
  handlerParams: {
    channel: '#bot-playground',
  },
});
```

*Note: instances are saved objects that are space aware*

## The Handler

The `handler` is what defines what happens when an action is *fired*. This
will define the particular integration such as slack, email, etc.

```JS
server.actions.registerHandler({
  actionType: 'notification',
  type: 'slack',
  params: {
    { name: 'channel', type: 'string' },
  },
  async handler({ actionParams, params }) {
    try {
      const body = JSON.stringify({
        ...params,
        username: 'webhookbot',
        text: actionParams.message,
        icon_emoji: ':ghost:',
      });
      const result = new url.URL(actionParams.destination);
      await fetch(result.toString(), {
        method: 'POST',
        body,
      });
    } catch (e) {
      warn(`[slack] failed with ${e.message}`);
    }
  },
});
```

## Defining Action Types

Registering action types is the way that these actions are exposed to the
alerts. Included in the definition are the required parameters that the alert
should provide and those that are handed off to the *handlers* to fit into
whatever service integration they provide.

```JS
server.actions.registerActionType({
  name: 'notification',
  params: [
    { name: 'destination', type: 'string' },
    { name: 'message', type: 'string' },
    { name: 'title', type: 'string', optional: true },
  ],
});
```

## Retrieve a list of available actions

If you want to see the available list of actions that are registered you can get
that list from the `server.actions` service.

```JS
server.actions.available(); // returns ['send message to slack']
```

Or from the front-end there is a REST API that will return the available actions.

```sh
$ curl -X GET localhost:5601/api/actions
```
