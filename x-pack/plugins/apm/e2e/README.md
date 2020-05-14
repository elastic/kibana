# End-To-End (e2e) Test for APM UI

**Run E2E tests**

```sh
x-pack/plugins/apm/e2e/run-e2e.sh
```

_Starts Kibana, APM Server, Elasticsearch (with sample data) and runs the tests_

## Reproducing CI builds

> This process is very slow compared to the local development described above. Consider that the CI must install and configure the build tools and create a Docker image for the project to run tests in a consistent manner.

The Jenkins CI uses a shell script to prepare Kibana:

```shell
# Prepare and run Kibana locally
$ x-pack/plugins/apm/e2e/ci/prepare-kibana.sh
# Build Docker image for Kibana
$ docker build --tag cypress --build-arg NODE_VERSION=$(cat .node-version) x-pack/plugins/apm/e2e/ci
# Run Docker image
$ docker run --rm -t --user "$(id -u):$(id -g)" \
    -v `pwd`:/app --network="host" \
    --name cypress cypress
```
