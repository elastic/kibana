# Asset Manager API Documentation

## Plugin configuration

This plugin is NOT fully enabled by default, even though it's always enabled
by Kibana's definition of "enabled". However, without the following configuration,
it will bail before it sets up any routes or returns anything from its
start, setup, or stop hooks.

To fully enable the plugin, set the following config values in your kibana.yml file:

```yaml
xpack.assetManager:
  alphaEnabled: true
```

## Depending on an asset client in your packages

If you're creating a shared UI component or tool that needs to access asset data, you
can create that code in a stateless Kibana package that can itself be imported into
any Kibana plugin without any dependency restrictions. To gain access to the asset data,
this component or tool can require the appropriate asset client to be passed in.

TODO: need to move main client types to a package so that they can be depended on by
other packages that require an injected asset client. Then we can list that package name
here and explain how to use those types in a package.

## Client APIs

This plugin provides asset clients for Kibana server and public usage. The differences between these
two clients are described below in their sections, while the methods for both APIs are described
in the Client Methods section.

These clients are set up in the following way. For a given "methodA":

```
publicMethodA(...options: MethodAPublicOptions)
  -> browser client calls corresponding REST API method with MethodAPublicOptions
  -> REST API handler calls corresponding serverMethodA
  -> serverMethodA requires MethodAPublicOptions & AssetClientDependencies, and it also
      injects some internal dependencies from the plugin's config on your behalf
```

The public and server clientss are both accessible to plugin dependants, but the REST API is NOT.

### Required dependency setup

To use either client, you must first add "assetManager" to your `"requiredDependencies"` array
in your plugin's kibana.jsonc file.

TECH PREVIEW NOTE: While this plugin is in "tech preview", in both the server and public clients,
the provided plugin dependencies can be undefined for this plugin if the proper configuration
has not been set (see above). For that reason, the types will force you to guard against this
undefined scenario. Once the tech preview gating is removed, this will no longer be the case.

### Server client usage

In your plugin's `setup` method, you can gain access to the client from the injected `plugins` map.
Make sure you import the `AssetManagerServerPluginSetup` type from the plugin's server
directory and add it to your own SetupPlugins type, as seen below.

```ts
import { AssetManagerServerPluginSetup } from '@kbn/assetManager-plugin/server';

interface MyPluginSetupDeps {
  assetManager: AssetManagerServerPluginSetup;
}

class MyPlugin {
  setup(core: CoreSetup, plugins: MyPluginSetupDeps) {
    // assetClient is found on plugins.assetManager.assetClient
    setupRoutes(router, plugins);
  }
}
```

To use the server client in your server routes, you can use something like this:

```ts
export function setupRoutes(router: IRouter, plugins: MyPluginDeps) {
  router.get<unknown, MyRouteOptions, unknown>(
    {
      path: '/my/path',
      validate: {},
    },
    async (context, req, res) => {
      // handle route
      // optionally, use asset client
      // NOTE: see below for important info on required server client args
      const hosts = await plugins.assetManager.assetClient.getHosts();
    }
  );
}
```

#### Required parameters for server client methods

All methods called via the server client require some core Kibana clients to be passed in,
so that they are pulled from the request context and properly scoped. If the asset manager
plugin provided these clients internally, they would not be scoped to the user that made
the API request, so they are required arguments for every server client method.

_Note: These required arguments are referred to as `AssetClientDependencies`, which can be
seen in the [the server types file](../server/types.ts)._

For example:

```ts
router.get<unknown, MyRouteOptions, unknown>(
  {
    path: '/my/path',
    validate: {},
  },
  async (context, req, res) => {
    // to use server asset client, you must get the following clients
    // from the request context and pass them to the client method
    // alongside whatever "public" arguments that method defines
    const coreContext = await context.core;
    const hostsOptions: PublicGetHostsOptions = {}; // these will be different for each method

    const hosts = await plugins.assetManager.assetClient.getHosts({
      ...hostsOptions,
      elasticsearchClient: coreContext.elasticsearch.client.asCurrentUser,
      savedObjectsClient: coreContext.savedObjects.client,
    });
  }
);
```

### Public client usage

You should grab the public client in the same way as the server one, via the plugin dependencies
in your `setup` lifecycle.

```ts
import { AssetManagerPublicPluginStart } from '@kbn/assetManager-plugin/public';

interface MyPluginStartDeps {
  assetManager: AssetManagerPublicPluginStart;
}

class MyPlugin {
  setup(core: CoreSetup) {
    core.application.register({
      id: 'my-other-plugin',
      title: '',
      appRoute: '/app/my-other-plugin',
      mount: async (params: AppMountParameters) => {
        // mount callback should not use setup dependencies, get start dependencies instead
        // so the pluginStart map passed to your renderApp method will be the start deps,
        // not the setup deps -- the same asset client is provided to both setup and start in public
        const [coreStart, , pluginStart] = await core.getStartServices();
        // assetClient is found on pluginStart.assetManager.assetClient
        return renderApp(coreStart, pluginStart, params);
      },
    });
  }
}
```

All methods in the public client only require their public options (seen below), and don't require
the "AssetClientDependencies" that are required for the server client versions of the same methods.
This is because the public client will use the asset manager's internal REST API under the hood, where
it will be able to pull the properly-scoped client dependencies off of that request context for you.

### Client methods

TODO: Link to a centralized asset document example that each response can reference?

#### getHosts

Get a list of host assets found within a specified time range.

| Parameter | Type            | Required? | Description                                                            |
| :-------- | :-------------- | :-------- | :--------------------------------------------------------------------- |
| from      | datetime string | yes       | ISO date string representing the START of the time range being queried |
| to        | datetime string | yes       | ISO date string representing the END of the time range being queried   |

**Response**

```json
{
  "hosts": [
    ...found host assets
  ]
}
```

#### getServices

Get a list of service assets found within a specified time range.

| Parameter | Type            | Required? | Description                                                            |
| :-------- | :-------------- | :-------- | :--------------------------------------------------------------------- |
| from      | datetime string | yes       | ISO date string representing the START of the time range being queried |
| to        | datetime string | yes       | ISO date string representing the END of the time range being queried   |
| parent    | string          | no        | EAN value for a given parent service to filter services by             |

**Response**

```json
{
  "services": [
    ...found service assets
  ]
}
```
