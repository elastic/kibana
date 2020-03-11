# Graph app

This is the main source folder of the Graph plugin. It contains all of the Kibana server and client source code. `x-pack/test/functional/apps/graph` contains additional functional tests.

Graph shows only up in the side bar if your server is running on a platinum or trial license. You can activate a trial license in `Management > License Management`.

## Common commands

* Run tests `node x-pack/scripts/jest.js --watch plugins/graph`
* Run type check `node scripts/type_check.js --project=x-pack/tsconfig.json`
* Run linter `node scripts/eslint.js x-pack/legacy/plugins/graph`
* Run functional tests (make sure to stop dev server)
  * Server `cd x-pack && node ./scripts/functional_tests_server.js`
  * Tests `cd x-pack && node ../scripts/functional_test_runner.js --config ./test/functional/config.js --grep=graph`

## Folder structure

### Client `public/`

Currently most of the state handling is done by a central angular controller. This controller will be broken up into a redux/saga setup step by step.

* `angular/` contains all code using javascript and angular. Rewriting this code in typescript and react is currently ongoing. When the migration is finished, this folder will go away
* `components/` contains react components for various parts of the interface. Components can hold local UI state (e.g. current form data), everything else should be passed in from the caller. Styles should reside in a component-specific stylesheet
* `hacks/` contains files that need to run before the actual app is started. When moving to the new platform, this folder will go away.
* `services/` contains functions that encapsule other parts of Kibana. Stateful dependencies are passed in from the outside. Components should not rely on services directly but have callbacks passed in. Once the migration to redux/saga is complete, only sagas will use services.
* `helpers/` contains side effect free helper functions that can be imported and used from components and services
* `state_management/` contains reducers, action creators, selectors and sagas. It also exports the central store creator
  * Each file covers one functional area (e.g. handling of fields, handling of url templates...)
  * Generally there is no file separation between reducers, action creators, selectors and sagas of the same functional area
  * Sagas may contain cross-references between multiple functional areas (e.g. the loading saga sets fields and meta data). Because of this it is possible that circular imports occur. In this case the sagas are moved to a separate file `<functional area>.sagas.ts`.
* `types/` contains type definitions for unmigrated functions in `angular/` and business objects
* `app.js` is the central entrypoint of the app. It initializes router, state management and root components. This will become `app.tsx` when the migration is complete


### Server `server/`

The Graph server is only forwarding requests to Elasticsearch API and contains very little logic. It will be rewritten soon.