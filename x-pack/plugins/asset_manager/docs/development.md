# Asset Manager Plugin Development

These docs contain information you might need if you are developing this plugin in Kibana. If you are interested in the APIs this plugin exposes, please see [./api.md](our API docs) instead.

## Running Tests

There are integration tests for the endpoints implemented thus far as well as for
the sample data tests. There is also a small set of tests meant to ensure that the
plugin is not doing anything without the proper config value in place to enable
the plugin fully. For more on enabling the plugin, see [the docs page](./docs/index.md).

The "not enabled" tests are run by default in CI. To run them manually, do the following:

```shell
$ node scripts/functional_tests_server --config x-pack/test/api_integration/apis/asset_manager/config_when_disabled.ts
$ node scripts/functional_test_runner --config=x-pack/test/api_integration/apis/asset_manager/config_when_disabled.ts
```

The "enabled" tests are NOT run by CI yet, to prevent blocking Kibana development for a
test failure in this alpha, tech preview plugin. They will be moved into the right place
to make them run for CI before the plugin is enabled by default. To run them manually:

```shell
$ node scripts/functional_tests_server --config x-pack/test/api_integration/apis/asset_manager/config.ts
$ node scripts/functional_test_runner --config=x-pack/test/api_integration/apis/asset_manager/config.ts
```

## Using Sample Data

This plugin comes with a full "working set" of sample asset documents, meant
to provide enough data in the correct schema format so that all of the API
endpoints return expected values.

To create the sample data, follow [the instructions in the REST API docs](./docs/index.md#sample-data).
