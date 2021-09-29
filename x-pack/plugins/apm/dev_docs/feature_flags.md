## Feature flags

To set up a flagged feature, add the name of the feature key (`apm:myFeature`) to [commmon/ui_settings_keys.ts](./common/ui_settings_keys.ts) and the feature parameters to [server/ui_settings.ts](./server/ui_settings.ts).

Test for the feature like:

```js
import { myFeatureEnabled } from '../ui_settings_keys';
if (core.uiSettings.get(myFeatureEnabled)) {
  doStuff();
}
```

Settings can be managed in Kibana under Stack Management > Advanced Settings > Observability.