# Uptime Monitoring

## Purpose

The purpose of this plugin is to provide users of Heartbeat more visibility of what's happening
in their infrastructure.

## Layout

There are three sections to the app, `common`, `public`, and `server`.

### common

Contains runtime types types, constants and a few other files.

Notably, we use `io-ts`/`fp-ts` functions and types to help provide
additional runtime safety for our API requests/responses.

### public

We use Redux and associated tools for managing our app state. Components come in the usual `connect`ed and
presentational varieties.

The `lib` directory controls bootstrapping code and adapter types.

There is a `pages` directory; each view gets its own page component.

The principal structure of the app is stored in `uptime_app.tsx`.

### server

The `lib` directory contains `adapters`, which are connections to external resources like Kibana
Server, Elasticsearch, etc. In addition, it contains domains, which are libraries that provide
functionality via adapters.

The `requests` directory contains functions responsible for querying Elasticsearch and parsing its
responses.

There's also a `rest_api` folder that defines the structure of the RESTful API endpoints.

## Testing

### Unit tests

Documentation: https://www.elastic.co/guide/en/kibana/current/development-tests.html#_unit_testing

```
yarn test:jest x-pack/plugins/uptime
```

### Functional tests

In one shell, from **~/kibana/x-pack**:
`node scripts/functional_tests_server.js`

In another shell, from **~kibana/x-pack**:
`node ../scripts/functional_test_runner.js --grep="{TEST_NAME}"`.

#### API tests

If instead you need to run API tests, start up the test server and then in another shell, from **~kibana/x-pack**:
`node ../scripts/functional_test_runner.js --config test/api_integration/config.ts --grep="{TEST_NAME}"`.

You can update snapshots by prefixing the runner command with `env UPDATE_UPTIME_FIXTURES=1`

You can access the functional test server's Kibana at `http://localhost:5620/`.

You can login with username `elastic` and password `changeme` by default.

If you want to freeze a UI or API test you can include an async call like `await new Promise(r => setTimeout(r, 1000 * 60))`
to freeze the execution for 60 seconds if you need to click around or check things in the state that is loaded.

#### Running --ssl tests

Some of our tests require there to be an SSL connection between Kibana and Elasticsearch.

We can run these tests like described above, but with some special config.

`node scripts/functional_tests_server.js --config=test/functional_with_es_ssl/config.ts`

`node scripts/functional_test_runner.js --config=test/functional_with_es_ssl/config.ts`

#### Running accessibility tests

We maintain a suite of Accessibility tests (you may see them referred to elsewhere as `a11y` tests).

These tests render each of our pages and ensure that the inputs and other elements contain the
attributes necessary to ensure all users are able to make use of Kibana (for example, users relying
on screen readers).

The commands for running these tests are very similar to the other functional tests described above.

From the `~/x-pack` directory:

Start the server: `node scripts/functional_tests_server --config test/accessibility/config.ts`

Run the uptime `a11y` tests: `node scripts/functional_test_runner.js --config test/accessibility/config.ts --grep=uptime`
