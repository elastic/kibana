# API integration tests

Many API integration tests for Ingest Manager trigger at some point a connection to the package registry, and retrieval of some packages. If these connections are made to a package registry deployment outside of Kibana CI, these tests can fail at any time for two reasons:
* the deployed registry is temporarily unavailable
* the packages served by the registry do not match the expectation of the code under test

For that reason, we run a dockerized version of the package registry in Kibana CI. For this to work, our tests must run against a custom test configuration and be kept in a custom directory, `x-pack/test/ingest_manager_api_integration`.

## How to run the tests locally

Usually, having the test server and the test runner in two different shells is most efficient, as it is possible to keep the server running and only rerun the test runner as often as needed. To do so, in one shell in the main `kibana` directory, run:
```
$ export INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT=12345
$ yarn test:ftr:server --config x-pack/test/ingest_manager_api_integration/config.ts
```

In another shell in the same directory, run
```
$ export INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT=12345
$ yarn test:ftr:runner --config x-pack/test/ingest_manager_api_integration/config.ts
```

However, it is also possible to **alternatively** run everything in one go, again from the main `kibana` directory:
```
$ export INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT=12345
$ yarn test:ftr --config x-pack/test/ingest_manager_api_integration/config.ts
```
Port `12345` is used as an example here, it can be anything, but the environment variable has to be present for the tests to run at all.


## DockerServers service setup

We use the `DockerServers` service provided by `kbn-test`. The documentation for this functionality can be found here:
https://github.com/elastic/kibana/blob/master/packages/kbn-test/src/functional_test_runner/lib/docker_servers/README.md

The main configuration for the `DockerServers` service for our tests can be found in `x-pack/test/ingest_manager_api_integration/config.ts`:

### Specify the arguments to pass to `docker run`:

```
  const dockerArgs: string[] = [
    '-v',
    `${path.join(
      path.dirname(__filename),
      './apis/fixtures/package_registry_config.yml'
    )}:/registry/config.yml`,
    '-v',
    `${path.join(
      path.dirname(__filename),
      './apis/fixtures/test_packages'
    )}:/registry/packages/test-packages`,
  ];
  ```

  `-v` mounts local paths into the docker image. The first one puts a custom configuration file into the correct place in the docker container, the second one mounts a directory containing additional packages.

### Specify the docker image to use

```
image: 'docker.elastic.co/package-registry/package-registry:kibana-testing-1'
```

This image contains the content of `docker.elastic.co/package-registry/package-registry:master` on June 26 2020. The image used here should be stable, i.e. using `master` would defeat the purpose of having a stable set of packages to be used in Kibana CI.

### Packages available for testing

The containerized package registry contains a set of packages which should be sufficient to run tests against all parts of Ingest Manager. The list of the packages are logged to the console when the docker container is initialized during testing, or when the container is started manually with

```
docker run -p 8080:8080 docker.elastic.co/package-registry/package-registry:kibana-testing-1
```

Additional packages for testing certain corner cases or error conditions can be put into `x-pack/test/ingest_manager_api_integration/apis/fixtures/test_packages`. A package `filetest` has been added there as an example.

## Some DockerServers background

For the `DockerServers` servers to run correctly in CI, the `INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT` environment variable needs to be under control of the CI environment. The reason behind this: it is possible that several versions of our tests are run in parallel on the same worker in Jenkins, and if we used a hard-coded port number here, those tests would run into port conflicts. (This is also the case for a few other ports, and the setup happens in `vars/kibanaPipeline.groovy`).

Also, not every developer has `docker` installed on their workstation, so it must be possible to run the testsuite as a whole without `docker`, and preferably this should be the default behaviour. Therefore, our `DockerServers` service is only enabled when `INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT` is set. This needs to be checked in every test like this:

```
    it('fetches a .json search file', async function () {
      if (server.enabled) {
        await supertest
          .get('/api/ingest_manager/epm/packages/filetest/0.1.0/kibana/search/sample_search.json')
          .set('kbn-xsrf', 'xxx')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);
      } else {
        warnAndSkipTest(this, log);
      }
    });
```

If the tests are skipped in this way, they are marked in the test summary as `pending` and a warning is logged:

```
└-: EPM Endpoints
   └-> "before all" hook
   └-: list
     └-> "before all" hook
     └-> lists all packages from the registry
       └-> "before each" hook: global before each
       │ warn disabling tests because DockerServers service is not enabled, set INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT to run them
       └-> lists all packages from the registry
       └-> "after all" hook
[...]  
           │
           │1 passing (233ms)
           │6 pending
           │

```
