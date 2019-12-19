# Licensing plugin

Retrieves license data from Elasticsearch and becomes a source of license data for all Kibana plugins on server-side and client-side.

## API: 
### Server-side
 The licensing plugin retrieves license data from **Elasticsearch** at regular configurable intervals.
- `license$: Observable<ILicense>` Provides a steam of license data [ILicense](./common/types.ts). Plugin emits new value whenever it detects changes in license info. If the plugin cannot retrieve a license from **Elasticsearch**, it will emit `an empty license` object. 
- `refresh: () => Promise<ILicense>` allows a plugin to enforce license retrieval.

### Client-side
 The licensing plugin retrieves license data from **licensing Kibana plugin** and does not communicate with Elasticsearch directly.
- `license$: Observable<ILicense>` Provides a steam of license data [ILicense](./common/types.ts). Plugin emits new value whenever it detects changes in license info. If the plugin cannot retrieve a license from **Kibana**, it will emit `an empty license` object. 
- `refresh: () => Promise<ILicense>` allows a plugin to enforce license retrieval.

## Migration path
The new platform licensing plugin became stateless now. It means that instead of storing all your data from `checkLicense` within the plugin, you should react on license data change on both the client and server sides.

### Before
```ts
// my_plugin/server/plugin.ts
function checkLicense(xpackLicenseInfo: XPackInfo){
  if (!xpackLicenseInfo || !xpackLicenseInfo.isAvailable()) {
     return {
      isAvailable: false,
      showLinks: true,
     }
  }
  if (!xpackLicenseInfo.feature('name').isEnabled()) {
    return {
      isAvailable: false,
      showLinks: false,
    }
  }
  const hasRequiredLicense = xPackInfo.license.isOneOf([
    'gold',
    'platinum',
    'trial',
  ]);
  return {
    isAvailable: hasRequiredLicense,
    showLinks: hasRequiredLicense,
  }
}
xpackMainPlugin.info.feature(pluginId).registerLicenseCheckResultsGenerator(checkLicense);

// my_plugin/client/plugin.ts
chrome.navLinks.update('myPlugin', {
  hidden: !xpackInfo.get('features.myPlugin.showLinks', false)
});
```

### After
```ts
// kibana.json
"requiredPlugins": ["licensing"],

// my_plugin/server/plugin.ts
import { LicensingPluginSetup, LICENSE_CHECK_STATE } from '../licensing/server'

interface SetupDeps {
  licensing: LicensingPluginSetup;
}

class MyPlugin {
  setup(core: CoreSetup, deps: SetupDeps) {
    deps.licensing.license$.subscribe(license => {
      const { state, message } = license.check('myPlugin', 'gold')
      const hasRequiredLicense = state === LICENSE_CHECK_STATE.Valid;
      if (hasRequiredLicense && license.getFeature('name').isAvailable) {
        // enable some server side logic 
      } else {
        log(message);
        // disable some server side logic 
      }
    })
  }
}

// my_plugin/public/plugin.ts
import { LicensingPluginSetup, LICENSE_CHECK_STATE } from '../licensing/public'
class MyPlugin {
  setup(core: CoreSetup, deps: SetupDeps) {
    deps.licensing.license$.subscribe(license => {
      const { state, message } = license.check('myPlugin', 'gold')
      const hasRequiredLicense = state === LICENSE_CHECK_STATE.Valid;
      const showLinks = hasRequiredLicense && license.getFeature('name').isAvailable;

      chrome.navLinks.update('myPlugin', {
        hidden: !showLinks
      });
    })
  }
}
```
