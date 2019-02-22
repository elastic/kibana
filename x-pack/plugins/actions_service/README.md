# Actions service

## Overview

The actions service is a registry of supported action types and connectors. The action service allows for
users to create action instances that can be reused across Kibana. Those action instances can then be
executed by any plugin or directly by users.

## Executing Actions

Each action instance can be fired with optional action type parameters. You need to have a defined action
instance in order to fire an action.

```JS
server.actions.fire({
  action: 'send message to slack',
  actionType: 'send message',
  params: {
    message: 'This is a test message from kibana actions service',
    title: 'custom title',
  },
})
```

The action `send message to slack` is the instance that is being fired. See below for how to create them

## Creating Instances

Instances are saved in the Kibana index and are used in order to `fire` an action with parameters. The
`params` required are specific to the `actionType` that you specify. Changing the `actionType` also
changes what `connectorTypes` are available for it.

```JS
server.actions.instance({
  name: 'send message to slack',
  actionType: 'send message',
  connectorType: 'slack',
  params: {
    destination: '<example slack url>',
  },
  connectorParams: {
    channel: '#bot-playground',
  },
});
```
