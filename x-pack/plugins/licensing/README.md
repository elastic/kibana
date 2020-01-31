# Licensing plugin

- [API](#api)
- [Migration example](#migration-example)
- [The list of breaking changes](#the-list-of-breaking-changes)
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

## Migration example
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
## The list of breaking changes

#### state
**LP**: The plugin allows consumers to calculate state on `license change` event and store this
The signature calculation is based on this state + license content
**NP**: We decided that license service doesn't keep plugins state https://github.com/elastic/kibana/pull/49345#issuecomment-553451472. Plugins have to react on license change and calculate license state on every license change. If another plugin needs that information, it should be exposed via a plugin contract.
This change makes NP & LP licensing service not compatible. We have to keep both until all plugins migrate to the new platform service. The legacy plugin consumes license data from the LP plugin.

#### Network request failures
**LP**: The licensing plugin didn’t emit a license in case of network errors. 
**NP**: Emits the license even if the request failed.

#### clusterSource
**LP**: Allows specifying cluster source to perform polling.
**NP**: The plugin always uses a `data` client. Provides `createLicensePoller` on the server-side to create a license poller with custom ES cluster.

#### Initial value on the client
**LP**: Passed on the page via inlined `xpackInitialInfo`
**NP**: Should be fetched

#### Config
**LP**: `xpack.xpack_main.xpack_api_polling_frequency_millis`
**NP**: `xpack.licensing.api_polling_frequency`

#### License
**NP**: `mode` field is provided, but deprecated.

#### sessionStorage
**LP**: License and signature were stored under different keys in session storage
**NP**: License and signature were stored under one key `xpack.licensing`

#### isOneOf
`isOneOf` removed, use `check` or `hasAtLeast` instead

#### Endpoint
`/api/xpack/v1/info` API endpoint is going to be removed. switch to `/api/licensing/info` instead

#### Fetch error
`getUnavailableReason` doesn't return `Error` object anymore, but `string`
