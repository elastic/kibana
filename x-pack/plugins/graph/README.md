# Graph app

This is the main source folder of the Graph plugin. It contains all of the Kibana server and client source code. `x-pack/test/functional/apps/graph` contains additional functional tests.

Graph shows only up in the side bar if your server is running on a platinum or trial license. You can activate a trial license in `Management > License Management`.

## Common commands

* Run tests `yarn test:jest x-pack/plugins/graph --watch`
* Run type check `node scripts/type_check.js --project=x-pack/tsconfig.json`
* Run linter `node scripts/eslint.js x-pack/plugins/graph`
* Run functional tests (make sure to stop dev server)
  * Server `node ./scripts/functional_tests_server.js --config x-pack/test/functional/apps/graph/config.ts`
  * Tests `node scripts/functional_test_runner.js --config x-pack/test/functional/apps/graph/config.ts`

## Folder structure

### Client `public/`

Currently state handled by react/redux/saga and the core mutable `GraphWorkspace` instance, which managing the nodes and edges state. It should be rewritten in typescript and integrated into redux store.

* `apps/` contains all graph app routes
* `components/` contains react components for various parts of the interface. Components can hold local UI state (e.g. current form data), everything else should be passed in from the caller. Styles should reside in a component-specific stylesheet
* `services/` contains the core workspace logic and functions that encapsule other parts of Kibana. Stateful dependencies are passed in from the outside. Components should not rely on services directly but have callbacks passed in. Once the migration to redux/saga is complete, only sagas will use services
* `helpers/` contains side effect free helper functions that can be imported and used from components and services
* `state_management/` contains reducers, action creators, selectors and sagas. It also exports the central store creator
  * Each file covers one functional area (e.g. handling of fields, handling of url templates...)
  * Generally there is no file separation between reducers, action creators, selectors and sagas of the same functional area
  * Sagas may contain cross-references between multiple functional areas (e.g. the loading saga sets fields and meta data). Because of this it is possible that circular imports occur. In this case the sagas are moved to a separate file `<functional area>.sagas.ts`.
* `types/` contains type definitions for unmigrated `GraphWorkspace` methods
* `router.tsx` is the central entrypoint of the app


### Server `server/`

The Graph server is only forwarding requests to Elasticsearch API and contains very little logic. It will be rewritten soon.