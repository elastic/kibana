# Kibana Notifications Plugin

The Notifications plugin provides a set of services to help Solutions and plugins send notifications to users.

## Notifications Plugin public API

### Start

The `start` function exposes the following interface:

- `isEmailServiceAvailable(): boolean`:
  A function to check whether the deployment is properly configured and the EmailService can be correctly retrieved.
- `getEmailService(): EmailService`:
- A function to get the basic EmailService, which can be used to send plain text emails. If the EmailService is not available, trying to retrieve it will result in an Exception.


### Usage

To use the exposed plugin start contract:

1. Make sure `notifications` is in your `optionalPlugins` in the `kibana.json` file:

```json5
// <plugin>/kibana.json
{
"id": "...",
"requiredPlugins": ["notifications"]
}
```

2. Use the exposed contract:

```ts
// <plugin>/server/plugin.ts
import { NotificationsPluginStart } from '../notifications/server`;

interface MyPluginStartDeps {
  notifications?: NotificationsPluginStart;
}

class MyPlugin {
  public start(
    core: CoreStart,
    { notifications }: MyPluginStartDeps
  ) {
    if (notifications.isEmailServiceAvailable()) {
      const emailService = notifications.getEmailService();
      emailService.sendPlainTextEmail({
          to: 'foo@bar.com',
          subject: 'Some subject',
          message: 'Hello world!',
      });
    }
    ...
  }
}
```

### Requirements

- This plugin currently depends on the `'actions'` plugin, as it uses `Connectors` under the hood.
- Note also that for each notification channel the corresponding connector must be preconfigured. E.g. to enable email notifications, an `Email` connector must exist in the system.
- Once the appropriate connectors are preconfigured in `kibana.yaml`, you can configure the `'notifications'` plugin by adding:

  ```yaml
  notifications:
    connectors:
      default:
        email: elastic-cloud-email  # The identifier of the configured connector
  ```
