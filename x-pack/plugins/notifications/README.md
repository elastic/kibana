# Kibana Notifications Plugin

The Notifications plugin provides a set of services to help Solutions and plugins send notifications to users.

## Notifications Plugin public API

### Setup

The `setup` function exposes the following interface:

- `email: Promise<IEmailService>`:
  A service that must be obtained asynchronously, and can be used to send plain text emails.

### Start

The `start` function exposes the following interface:

- `email: Promise<IEmailService>`:
  A service that must be obtained asynchronously, and can be used to send plain text emails.


### Usage

To use the exposed plugin start and setup contracts:

1. Make sure `notifications` is in your `optionalPlugins` in the `kibana.json` file:

```json5
// <plugin>/kibana.json
{
"id": "...",
"optionalPlugins": ["notifications"]
}
```

2. Use the exposed contracts:

```ts
// <plugin>/server/plugin.ts
import { NotificationsPluginStart } from '../notifications/server`;

interface MyPluginStartDeps {
  notifications?: NotificationsPluginStart;
}

class MyPlugin {
  public async start(
    core: CoreStart,
    { notifications }: MyPluginStartDeps
  ) {
    const emailService = await notifications?.email;
    emailService.sendPlainTextEmail({
        to: 'foo@bar.com',
        subject: 'Some subject',
        message: 'Hello world!',
    });
    ...
  }
}
```

### Requirements

- This plugin currently depends on the `'actions'` plugin, as it uses `Connectors` under the hood. Please make sure the `'actions'` plugin is included in your deployment.
- Note also that for each notification channel the corresponding connector must be preconfigured. E.g. to enable email notifications, an `Email` connector must exist in the system.
- Once the appropriate connectors are preconfigured in `kibana.yaml`, you can configure the `'notifications'` plugin by adding:

  ```yaml
  notifications:
    connectors:
      default:
        email: elastic-cloud-email  # The identifier of the configured connector
  ```
