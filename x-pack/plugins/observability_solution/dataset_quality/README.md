# Dataset Quality

In order to make ongoing maintenance of log collection easy we want to introduce the concept of dataset quality, where users can easily get an overview on the datasets they have with information such as integration, size, last activity, among others.

## Development

### Unit Tests

Kibana primarily uses Jest for unit testing. Each plugin or package defines a `jest.config.js` that extends a preset provided by the `@kbn/test` package. The following command runs all Dataset quality unit tests:

```
yarn jest --config x-pack/plugins/observability_solution/dataset_quality/jest.config.js
```

You can also run a specific test by passing the filepath as an argument, e.g.:

```
yarn jest --config x-pack/plugins/observability_solution/dataset_quality/jest.config.js x-pack/plugins/observability_solution/dataset_quality/server/routes/data_streams/get_data_streams/get_data_streams.test.ts
```

#### API integration tests

| Option       | Description                                     |
| ------------ | ----------------------------------------------- |
| --server     | Only start ES and Kibana                        |
| --runner     | Only run tests                                  |
| --grep       | Specify the specs to run                        |
| --grep-files | Specify the files to run                        |
| --inspect    | Add --inspect-brk flag to the ftr for debugging |
| --times      | Repeat the test n number of times               |

The API tests are located in [`x-pack/test/dataset_quality_api_integration/`](/x-pack/test/dataset_quality_api_integration/).

#### Start server and run test (single process)

```
node x-pack/plugins/observability_solution/dataset_quality/scripts/api [--help]
```

The above command will start an ES instance on http://localhost:9220, a Kibana instance on http://localhost:5620 and run the api tests.
Once the tests finish, the instances will be terminated.

#### Start server and run test (separate processes)

```sh
# start server
node x-pack/plugins/observability_solution/dataset_quality/scripts/api --server

# run tests
node x-pack/plugins/observability_solution/dataset_quality/scripts/api --runner --grep-files=error_group_list
```


### Functional Tests

### Stateful
#### FTR Server
```
yarn test:ftr:server --config ./x-pack/test/functional/apps/dataset_quality/config.ts
```

#### FTR Runner
```
yarn test:ftr:runner --config ./x-pack/test/functional/apps/dataset_quality/config.ts --include ./x-pack/test/functional/apps/dataset_quality/index.ts
```

#### Running Individual Tests
```
yarn test:ftr:runner --config ./x-pack/test/functional/apps/dataset_quality/config.ts --include ./x-pack/test/functional/apps/dataset_quality/$1
```

### Serverless

#### Server
```
yarn test:ftr:server --config ./x-pack/test_serverless/functional/test_suites/observability/config.ts
```

#### Runner
```
yarn test:ftr:runner --config ./x-pack/test_serverless/functional/test_suites/observability/config.ts --include ./x-pack/test_serverless/functional/test_suites/observability/dataset_quality/index.ts
```
#### Running Individual Tests
```
yarn test:ftr:runner --config ./x-pack/test_serverless/functional/test_suites/observability/config.ts --include ./x-pack/test_serverless/functional/test_suites/observability/dataset_quality/$1
```