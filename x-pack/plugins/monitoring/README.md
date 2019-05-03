## Using Monitoring

The easiest way to get to know the new Monitoring is probably by [reading the
docs](https://github.com/elastic/x-plugins/blob/master/docs/public/marvel/index.asciidoc).

Install the distribution the way a customer would is pending the first release
of Unified X-Pack plugins.

## Developing

You will need to get Elasticsearch and X-Pack plugins for ES that match the
version of the UI. The best way to do this is to run `gradle run` from a clone
of the x-plugins repository.

To set up Monitoring and automatic file syncing code changes into Kibana's plugin
directory, clone the kibana and x-plugins repos in the same directory and from
`x-plugins/kibana/monitoring`, run `yarn start`.

Once the syncing process has run at least once, start the Kibana server in
development mode. It will handle restarting the server and re-optimizing the
bundles as-needed. Go to https://localhost:5601 and click Monitoring from the App
Drawer.

## Running tests

- Run the command:
  ```
  yarn test
  ```

- Debug tests
Add a `debugger` line to create a breakpoint, and then:

  ```
  gulp sync && mocha debug --compilers js:@babel/register /pathto/kibana/plugins/monitoring/pathto/__tests__/testfile.js
  ```

## Multicluster Setup for Development

To run the UI with multiple clusters, the easiest way is to run 2 nodes out of
the same Elasticsearch directory, but use different start up commands for each one. One
node will be assigned to the "monitoring" cluster and the other will be for the "production"
cluster.

1. Add the Security users:
  ```
  % ./bin/x-pack/users useradd -r remote_monitoring_agent -p notsecure remote
  % ./bin/x-pack/users useradd -r monitoring_user -p notsecure monitoring_user
  ```

1. Start up the Monitoring cluster:
  ```
  % ./bin/elasticsearch \
  -Ehttp.port=9210 \
  -Ecluster.name=monitoring \
  -Epath.data=monitoring-data \
  -Enode.name=monitor1node1
  ```

1. Start up the Production cluster:
  ```
  % ./bin/elasticsearch \
  -Expack.monitoring.exporters.id2.type=http \
  -Expack.monitoring.exporters.id2.host=http://127.0.0.1:9210 \
  -Expack.monitoring.exporters.id2.auth.username=remote \
  -Expack.monitoring.exporters.id2.auth.password=notsecure \
  -Ecluster.name=production \
  -Enode.name=prod1node1 \
  -Epath.data=production-data
  ```

1. Set the Kibana config:
  ```
  % cat config/kibana.dev.yml
  xpack.monitoring.elasticsearch:
    url: "http://localhost:9210"
    username: "kibana"
    password: "changeme"
  ```

1. Start another Kibana instance:
  ```
  % yarn start
  ```

1. Start a Kibana instance connected to the Monitoring cluster (for running queries in Sense on Monitoring data):
  ```
  % ./bin/kibana --config config/kibana.dev.yml --elasticsearch.hosts http://localhost:9210 --server.name monitoring-kibana --server.port 5611
  ```
