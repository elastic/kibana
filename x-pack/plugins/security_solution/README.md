# Security Solution

Welcome to the Kibana Security Solution plugin! This README will go over getting started with development and testing.

## Development

## Tests

The endpoint specific tests leverage the ingest manager to install the endpoint package. Before the api integration
and functional tests are run the ingest manager is initialized. This initialization process includes reaching out to
a package registry service to install the endpoint package. The endpoint tests support three different ways to run
the tests given the constraint on an available package registry.

1. Using Docker
2. Running your own local package registry
3. Using the default external package registry

These scenarios will be outlined the sections below.

### Endpoint API Integration Tests Location

The endpoint api integration tests are located [here](../../test/security_solution_endpoint_api_int)

### Endpoint Functional Tests Location

The endpoint functional tests are located [here](../../test/security_solution_endpoint)

### Using Docker

To run the tests using the recommended docker image version you must have `docker` installed. The testing infrastructure
will stand up a docker container using the image defined [here](../../test/ingest_manager_api_integration/config.ts#L15)

Make sure you're in the Kibana root directory.

#### Endpoint API Integration Tests

In one terminal, run:

```bash
INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:server --config x-pack/test/security_solution_endpoint_api_int/config.ts
```

In another terminal, run:

```bash
INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner --config x-pack/test/security_solution_endpoint_api_int/config.ts
```

#### Endpoint Functional Tests

In one terminal, run:

```bash
INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:server --config x-pack/test/security_solution_endpoint/config.ts
```

In another terminal, run:

```bash
INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner --config x-pack/test/security_solution_endpoint/config.ts
```

### Running your own package registry

If you are doing endpoint package development it will be useful to run your own package registry to serve the latest package you're building.
To do this use the following commands:

Make sure you're in the Kibana root directory.

#### Endpoint API Integration Tests

In one terminal, run:

```bash
PACKAGE_REGISTRY_URL_OVERRIDE=<url to your package registry like http://localhost:8080> yarn test:ftr:server --config x-pack/test/security_solution_endpoint_api_int/config.ts
```

In another terminal, run:

```bash
PACKAGE_REGISTRY_URL_OVERRIDE=<url to your package registry like http://localhost:8080>  yarn test:ftr:runner --config x-pack/test/security_solution_endpoint_api_int/config.ts
```

#### Endpoint Functional Tests

In one terminal, run:

```bash
PACKAGE_REGISTRY_URL_OVERRIDE=<url to your package registry like http://localhost:8080> yarn test:ftr:server --config x-pack/test/security_solution_endpoint/config.ts
```

In another terminal, run:

```bash
PACKAGE_REGISTRY_URL_OVERRIDE=<url to your package registry like http://localhost:8080>  yarn test:ftr:runner --config x-pack/test/security_solution_endpoint/config.ts
```

### Using the default public registry

If you don't have docker installed and don't want to run your own registry, you can run the tests using the ingest manager's default public package registry. The actual package registry used is [here](../../plugins/fleet/common/constants/epm.ts#L9)

Make sure you're in the Kibana root directory.

#### Endpoint API Integration Tests

In one terminal, run:

```bash
yarn test:ftr:server --config x-pack/test/security_solution_endpoint_api_int/config.ts
```

In another terminal, run:

```bash
yarn test:ftr:runner --config x-pack/test/security_solution_endpoint_api_int/config.ts
```

#### Endpoint Functional Tests

In one terminal, run:

```bash
yarn test:ftr:server --config x-pack/test/security_solution_endpoint/config.ts
```

In another terminal, run:

```bash
yarn test:ftr:runner --config x-pack/test/security_solution_endpoint/config.ts
```
