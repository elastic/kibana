# API Emulator

API Emulator is a framework wrapped around [Hapi](https://hapi.dev/) that enables developer to quickly create API interfaces for development and testing purposes. Emulator plugins (a wrapper around [Hapi plugins](https://hapi.dev/api/?v=21.3.3#plugins)) is the mechanism used to create an given set of APIs for emulation, and these are then added to the server framework which makes them available via the server's routes.  

The following script can be used to start the External EDR Server Emulator from the command line:

```shell
node x-pack/plugins/security_solution/scripts/endpoint/start_external_edr_server_emulator.js
```

Use the `--help` option to view what arguments can be used

For usages other than the command line, see the Development section below.



## Development

### Adding an new Plugin

Plugins are the mechanism for adding API emulators into this framework. Each plugin is defined via an object that includes at a minimum the `name` and a `register()` callback. This callback for registering the plugin will be provided with an interface that allows the plugin to interact with the HTTP server and provide access to "core" services available at the server level for use by all plugins. 

Example: A method that returns the definition for a plugin

```typescript

export const getFooPluginRegistration = () => {
  return {
    name: 'foo',                // [1]
    register(server) {
      // register routes
      server.router.route({
        path: '/api/get',       // [2]
        method: 'GET',
        handler: async (req, h) => {
          return 'alive!';
        }
      })
    }
  }
}
```

In the above example:

1. a plugin with the name `foo` [1] will be registered. The name of the plugin will also be the default `prefix` to all API routes (an optional attributed named `prefix` is also available if wanting to use a different value for the namespacing the routes).
2. the `register()` callback will be given a `server` argument that provides access to server level services like the HTTP `router`
3. a new route is registered [2], which will be mounted at `/foo/api/get` - note the use of the plugin name as the route prefix


#### Plugin HTTP routes

HTTP route handlers work very similar to the route handlers in Kibana today. You are given a `Request` and a Response Factory by the Hapi framework - see the [HAPI docs on Lifecycle Methods](https://hapi.dev/api/?v=21.3.3#lifecycle-methods) for more details.

This emulator framework will expose the core services (ex. for the EDR server emulator, this would include Kibana and Elasticsearch clients) to each route under `request.pre` (pre-handler methods).

Example: a route handler under the EDR server emulator that returns the version of kibana

```typescript

const handler = async (req, h) => {
  const kbnStatus = await req.pre.services.kbnClient.status.get();
  
  return kbnStatus.version.number;
}

```
