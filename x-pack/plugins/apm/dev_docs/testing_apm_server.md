# Testing APM Server changes with Tilt

This document provides instructions on how to use Tilt to start a local Kubernetes (k8s) cluster for APM Server development that communicates with a local Kibana instance. This is useful when you want to test recent changes in APM Server, as the bundled or published package might not be available yet.

## Prerequisites

- Docker must be installed and running on your local system.
- You should have the APM Server repo checked out which contains the Tiltfile.

## Setup

There are two methods to start your Kubernetes cluster using Tilt:

- With a Kibana Docker container started as part of the Kubernetes cluster.
- Connecting to a locally running Kibana instance.

### Starting Kibana as a Docker container

By default, when running `tilt up` without any additional configuration, Tilt will start a Kibana Docker container as part of the Kubernetes cluster:

`$ tilt up`

### Connecting to a locally running Kibana instance

If you want to run Kibana locally and connect it with the Kubernetes cluster, follow these steps:

- Start your local Kibana instance (`yarn start`)
- Navigate to the APM Server Repo and start Tilt with the '--local-kibana' flag: `$ tilt up -- --local-kibana`

**Note**: You should start the local Kibana instance before or immediately after running the Tilt command.

As part of the Tilt setup, a `kibana_system_user` is created with the password `changeme`. You can use this user and password for your `kibana.yml` file:

```
elasticsearch.username: kibana_system_user
elasticsearch.password: changeme
```

### Building and Uploading APM Server Package

When you start Tilt, the APM Server package is built from the source and uploaded to Kibana automatically. This allows you to test recent changes in your APM Server.
