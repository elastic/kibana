# Running Components from Source

**First, a note about SSL:** By default, many of the elastic stack components will attempt to run using self-signed SSL certificates. But these certificates will not be trusted by any of the other components involved.

As such this guide will favor disabling SSL whenever possible. At some point we may have better build support for a shared CA between source components, at which point we should be able to test with SSL enabled.

## Elasticsearch

The [TESTING](https://github.com/elastic/elasticsearch/blob/master/TESTING.asciidoc) doc covers basic runtime setup.

### Single cluster testing

For single cluster tests you can use the "run" command like this (with internal collection enabled):

```shell
./gradlew run -Drun.license_type=trial -Dtests.es.xpack.monitoring.collection.enabled=true -Dtest.es.xpack.monitoring.exporters.id0.type=local
```

For metricbeat collection, omit the monitoring settings.

Optionally set `--max-workers=1` for less terminal noise once the initial build is complete.

The passwords won't be the usual "changeme" so run this to set them for use with typical Kibana dev settings:

```shell
curl -k -u elastic-admin:elastic-password -H 'Content-Type: application/json' \
  http://localhost:9200/_security/user/elastic/_password -d'{"password": "changeme"}'
curl -k -u elastic:changeme -H 'Content-Type: application/json' \
  http://localhost:9200/_security/user/kibana_system/_password -d'{"password": "changeme"}'
```

### Multi-cluster tests (for CCR/CCS or listing)

To setup multiple clusters we'll start by running a single node cluster first, this generates some config files that we can edit and copy when adding
more nodes or clusters.

For multi-cluster tests it's best to create a package first:

```shell
./gradlew localDistro
```

Then move into the distro path:

```shell
cd "$(ls -1dt build/distribution/local/elasticsearch-* | head -n1)"
```

Then start the server, with or without internal collection enabled:

```shell
./bin/elasticsearch -E cluster.name=main -E xpack.license.self_generated.type=trial -E xpack.monitoring.collection.enabled=true -E xpack.monitoring.exporters.id0.type=local
```

Or:

```shell
./bin/elasticsearch -E xpack.license.self_generated.type=trial
```

Once it shows the generated password, stop the server (Ctrl+C) and disable SSL by changing this entry in `config/elasticsearch.yml`:

```yaml
xpack.security.http.ssl:
  enabled: false
```

Then restart the server and reset the passwords:

```shell
curl -u elastic:'PASSWORD' -H 'Content-Type: application/json' \
http://localhost:9200/_security/user/elastic/_password -d'{"password": "changeme"}'
curl -u elastic:changeme -H 'Content-Type: application/json' \
http://localhost:9200/_security/user/kibana_system/_password -d'{"password": "changeme"}'
```

To start the second server (in another terminal from the same directory), run the commands below:

```shell
export ES_PATH_CONF=config-secondary
mkdir -p "${ES_PATH_CONF}"
cp -r config/* "${ES_PATH_CONF}"
```

To report internal collection to the main server, you also need to add the password to the new keychain:

```shell
echo changeme | ./bin/elasticsearch-keystore add xpack.monitoring.exporters.id0.auth.secure_password
```

And finally start the server, with or without internal collection enabled (make sure ES_PATH_CONF is still set to `config-secondary`):

```shell
./bin/elasticsearch -E cluster.name=secondary -E http.port=9210 -E transport.port=9310 -E path.data=data-secondary -E xpack.license.self_generated.type=trial \
                    -E xpack.monitoring.collection.enabled=true \
                    -E xpack.monitoring.exporters.id0.type=http -E xpack.monitoring.exporters.id0.host=http://localhost:9200 \
                    -E xpack.monitoring.exporters.id0.auth.username=elastic \
                    -E xpack.monitoring.exporters.id0.ssl.verification_mode=none
```

Or:
```shell
./bin/elasticsearch -E cluster.name=secondary -E http.port=9210 -E transport.port=9310 -E path.data=data2 -E xpack.license.self_generated.type=trial
```

You'll likely want to reset the passwords for the secondary cluster as well:

```shell
curl -k -u elastic:'PASSWORD' -H 'Content-Type: application/json' \
  http://localhost:9210/_security/user/elastic/_password -d'{"password": "changeme"}'
curl -k -u elastic:changeme -H 'Content-Type: application/json' \
  http://localhost:9210/_security/user/kibana_system/_password -d'{"password": "changeme"}'
```

For metricbeat collection, omit the monitoring settings, provide both cluster hosts to the elasticsearch metricbeat module config (see [metricbeat](#metricbeat) section below), and remove the exporter password from the keychain:

```shell
./bin/elasticsearch-keystore remove xpack.monitoring.exporters.id0.auth.secure_password
```

#### CCR configuration

Once you have two clusters going you can use something like this to configure the remote (or use Kibana).

```
curl -u elastic:changeme -H 'Content-Type: application/json' \
  -XPUT -d'{"persistent": {"cluster": {"remote": {"secondary": {"seeds": ["127.0.0.1:9310"]}}}}}' \
  http://localhost:9200/_cluster/settings
```

Create an index on the secondary cluster:

```
curl -XPOST -H'Content-Type: application/json' -d'{"some": "stuff"}' -u elastic:changeme http://localhost:9210/stuff/_doc
```

Then use the "Cross-Cluster Replication" Kibana UI to set up a follower index (`stuff-replica`) in the main cluster.

Note that the replica may show as "paused" for the first few seconds of replication. Wait and refresh the page.

You can `POST` some additional documents to the secondary cluster ensure you have something in the "Ops synced" metrics on stack monitoring.

The [CCR Tutorial](https://www.elastic.co/guide/en/elasticsearch/reference/current/ccr-getting-started-tutorial.html) has more details. Note that you can skip the role updates since we're just using the `elastic` user on both clusters.

### Machine Learning configuration

Note: You might want to skip to the Beats section first to gather data to run the ML job on.

If you used one of the above methods to launch Elasticsearch it should already be capable of running ML jobs. For cloud configurations, make sure your deployment includes at least one ML node (or has auto-scaled one) before you attempt to monitor ML jobs.

You can create job using the machine learning UI in Kibana. Select (or create) a data view that's getting some data ingested. Create a "Single metric" job that counts the documents being ingested. You can push the "Use full data" button as well, since you probably have a small test data set.

Note: There seems to be a router bug that throws you back to the overview page when clicking "Use full data", just try again.

Once the job is created push the "Start job running in real time". This will help exercise the active-job state in Stack Monitoring UI.

### Multi-node configuration

This is a little trickier, but possible.

As noted [in the public docs](https://www.elastic.co/guide/en/elasticsearch/reference/master/modules-discovery-bootstrap-cluster.html) be careful about the presence of any old `data*` or `config*` directories. The commands below should work on the first run, but if you have previously started any other clusters with the same paths, they might fail. Elasticsearch won't start if it detects the possibility of data loss due to incorrect cluster bootstrapping.

Here's an example setting up a 3-node `main` cluster across 3 terminal windows, assuming you've already started an initial cluster and set `xpack.security.http.ssl` set to false in the config as above.

Note that the first two nodes will pause after initial setup, waiting for the last one to become available.

In the first terminal run this for node main-0:

```
export ES_PATH_CONF=config-main-0
mkdir -p "${ES_PATH_CONF}"
cp -r config/* "${ES_PATH_CONF}"

./bin/elasticsearch -E cluster.name=main -Enode.name=main-0 \
  -E http.port=9200 -E transport.port=9300 -E path.data=data-main-0 \
  -Ediscovery.seed_hosts=127.0.0.1:9300,127.0.0.1:9301,127.0.0.1:9302 \
  -Ecluster.initial_master_nodes=127.0.0.1:9300,127.0.0.1:9301,127.0.0.1:9302
```

This will hold waiting for a second node.

In the second terminal run this for node main-1:

```
export ES_PATH_CONF=config-main-1
mkdir -p "${ES_PATH_CONF}"
cp -r config/* "${ES_PATH_CONF}"

./bin/elasticsearch -E cluster.name=main -Enode.name=main-1 \
  -E http.port=9201 -E transport.port=9301 -E path.data=data-main-1 \
  -Ediscovery.seed_hosts=127.0.0.1:9300,127.0.0.1:9301,127.0.0.1:9302 \
  -Ecluster.initial_master_nodes=127.0.0.1:9300,127.0.0.1:9301,127.0.0.1:9302
```

At this point, the 2 nodes will elect a master which will print out the password for the `elastic` user. You can use this to then reset the password on any of the nodes, the same as above, like so:

```
curl -u elastic:'PASSWORD' -H 'Content-Type: application/json' \
http://localhost:9200/_security/user/elastic/_password -d'{"password": "changeme"}'
curl -u elastic:changeme -H 'Content-Type: application/json' \
http://localhost:9200/_security/user/kibana_system/_password -d'{"password": "changeme"}'
```

Then in the third terminal run this for node main-2:

```
export ES_PATH_CONF=config-main-2
mkdir -p "${ES_PATH_CONF}"
cp -r config/* "${ES_PATH_CONF}"

./bin/elasticsearch -E cluster.name=main -Enode.name=main-2 \
  -E http.port=9202 -E transport.port=9302 -E path.data=data-main-2 \
  -Ediscovery.seed_hosts=127.0.0.1:9300,127.0.0.1:9301,127.0.0.1:9302 \
  -Ecluster.initial_master_nodes=127.0.0.1:9300,127.0.0.1:9301,127.0.0.1:9302
```

One the third node is booted you should be able to see all 3 in the nodes list of any instance. You can confirm this with:

```
curl -u elastic:changeme localhost:9200/_cat/nodes
```

Starting a 3 node secondary cluster is a similar process, included here for easy copy-paste.

In a terminal for secondary-0 run:

```
export ES_PATH_CONF=config-secondary-0
mkdir -p "${ES_PATH_CONF}"
cp -r config/* "${ES_PATH_CONF}"

./bin/elasticsearch -E cluster.name=secondary -Enode.name=secondary-0 \
  -E http.port=9210 -E transport.port=9310 -E path.data=data-secondary-0 \
  -Ediscovery.seed_hosts=127.0.0.1:9310,127.0.0.1:9311,127.0.0.1:9312 \
  -Ecluster.initial_master_nodes=127.0.0.1:9310,127.0.0.1:9311,127.0.0.1:9312
```

For secondary-1 run:

```
export ES_PATH_CONF=config-secondary-1
mkdir -p "${ES_PATH_CONF}"
cp -r config/* "${ES_PATH_CONF}"

./bin/elasticsearch -E cluster.name=secondary -Enode.name=secondary-1 \
  -E http.port=9211 -E transport.port=9311 -E path.data=data-secondary-1 \
  -Ediscovery.seed_hosts=127.0.0.1:9310,127.0.0.1:9311,127.0.0.1:9312 \
  -Ecluster.initial_master_nodes=127.0.0.1:9310,127.0.0.1:9311,127.0.0.1:9312
```

At this point you can reset the password via port 9210:

```
curl -u elastic:'PASSWORD' -H 'Content-Type: application/json' \
http://localhost:9210/_security/user/elastic/_password -d'{"password": "changeme"}'
curl -u elastic:changeme -H 'Content-Type: application/json' \
http://localhost:9210/_security/user/kibana_system/_password -d'{"password": "changeme"}'
```

Then for secondary-2 run:

```
export ES_PATH_CONF=config-secondary-2
mkdir -p "${ES_PATH_CONF}"
cp -r config/* "${ES_PATH_CONF}"

./bin/elasticsearch -E cluster.name=secondary -Enode.name=secondary-2 \
  -E http.port=9212 -E transport.port=9312 -E path.data=data-secondary-2 \
  -Ediscovery.seed_hosts=127.0.0.1:9310,127.0.0.1:9311,127.0.0.1:9312 \
  -Ecluster.initial_master_nodes=127.0.0.1:9310,127.0.0.1:9311,127.0.0.1:9312
```

Note that all 6 nodes will need to be in the metricbeat config if you want to run the Stack Monitoring UI as well. Here's an example `metricbeat.multinode.yaml` you can use as a starting point:

```yaml
http.enabled: true

metricbeat.modules:
  - module: system

  - module: elasticsearch
    xpack.enabled: true
    period: 10s
    hosts:
      # main
      - "localhost:9200"
      - "localhost:9201"
      - "localhost:9202"
      # secondary
      - "localhost:9210"
      - "localhost:9211"
      - "localhost:9212"
    username: "elastic"
    password: "changeme"

  - module: kibana
    xpack.enabled: true
    basepath: "/ftw"
    period: 10s
    hosts: [ "localhost:5601" ]
    username: "elastic"
    password: "changeme"

  - module: beat
    xpack.enabled: true
    period: 10s
    hosts:
      # filebeat
      - "http://localhost:5068"

output.elasticsearch:
  hosts: [ "localhost:9200" ]
  username: "elastic"
  password: "changeme"
```

## Kibana

See the [local setup](local_setup.md) guide for running from source.

If you need to run Kibana from a release snapshot on macOS, note that you'll likely need to run `xattr -r -d com.apple.quarantine node/bin/node` to be able to run the packaged node runtime.

## Beats

The [beats contributing guide](https://www.elastic.co/guide/en/beats/devguide/current/beats-contributing.html) covers the basics, though still references `make` when you'll probably need to use [mage](https://github.com/magefile/mage) (homebrew install should work fine).

### Metricbeat

Once you have golang and mage you should be able to build an x-pack-capable (for enterprisesearch) version of metricbeat with:

```
cd x-pack/metricbeat
mage build
```

Then create a `metricbeat.source.yml` configuration file (or enable modules, but that leads to git changes):

```yaml
http.enabled: true

metricbeat.modules:
  - module: system

  - module: elasticsearch
    xpack.enabled: true
    period: 10s
    hosts:
      # main
      - "localhost:9200"
      # secondary
      - "localhost:9210"
    username: "elastic"
    password: "changeme"

  - module: kibana
    xpack.enabled: true
    basepath: "/ftw"
    period: 10s
    hosts: [ "localhost:5601" ]
    username: "elastic"
    password: "changeme"

  - module: logstash
    xpack.enabled: true
    period: 10s
    hosts: [ "localhost:9600" ]

  - module: beat
    xpack.enabled: true
    period: 10s
    hosts:
      # apm-server
      - "http://localhost:5067"
      # filebeat
      - "http://localhost:5068"

  - module: enterprisesearch
    xpack.enabled: true
    period: 10s
    hosts: ["http://localhost:3002"]
    username: elastic
    password: changeme

output.elasticsearch:
  hosts: [ "localhost:9200" ]
  username: "elastic"
  password: "changeme"
```

Feel free to comment out any sections for components you're not currently running.

Then start metricbeat in the foreground with `./metricbeat -e -c metricbeat.source.yml`.

If you want to monitor that metricbeat itself, create another configuration file `metricbeat.beats.yml`, like this:

```yaml
path.home: ./beats-monitor

metricbeat.modules:
  - module: beat
    xpack.enabled: true
    period: 10s
    hosts: [ "http://127.0.0.1:5066" ]

output.elasticsearch:
  hosts: [ "localhost:9200" ]
  username: "elastic"
  password: "changeme"
```

And run that in the foreground from another terminal with `./metricbeat -e -c metricbeat.beats.yml`.

Or for internal collection use a config like this for traversing the [production deployment](../reference/terminology.md#production-deployment):

```
monitoring:
  enabled: true
  elasticsearch:
    hosts: ["http://localhost:9200"]
    username: elastic
    password: changeme
```

You can also include a `cluster_uuid` setting which will presume you're shipping direct to the [monitoring deployment](../reference/terminology.md#monitoring-deployment).

### Filebeat

Similar to metricbeat, once you have golang and mage you should be able to build metricbeat with:

```
cd filebeat
mage build
```

Then to ingest the log files from the `localDistro` elasticsearch, create a `filebeat.source.yml` configuration file (or enable modules, but that leads to git changes):

```yaml
http.enabled: true
http.port: 5067

filebeat.modules:
  - module: elasticsearch
    server:
      enabled: true
      var.paths:
        - ../../elasticsearch/build/distribution/local/elasticsearch-*-SNAPSHOT/logs/*.log
        - ../../elasticsearch/build/distribution/local/elasticsearch-*-SNAPSHOT/logs/*_server.json

output.elasticsearch:
  hosts: [ "http://localhost:9200" ]
  username: "elastic"
  password: "changeme"
```

Update the paths if your beats and elasticsearch clones are not siblings on your filesystem.

And run that in the foreground with `./filebeat -e -c filebeat.source.yml`.

If you need to inspect the filebeat output, it's best to start another filebeat with its own config like `filebeat.stdout.yml`:

```yaml
filebeat.modules:
  - module: elasticsearch
    server:
      enabled: true
      var.paths:
        - ../../elasticsearch/build/distribution/local/elasticsearch-*-SNAPSHOT/logs/*.log
        - ../../elasticsearch/build/distribution/local/elasticsearch-*-SNAPSHOT/logs/*_server.json

output.console:
  pretty: true
```

And run it with its own data path like `./filebeat -e -c filebeat.stdout.yml -E path.data=data2`

This way you can see the exact structure that's being fed into the elasticsearch ingest pipeline.

### APM server

You can build and run APM server from source using the [build instructions](https://github.com/elastic/apm-server#build).

Before you can run APM server you must install the "Elastic APM" integration. See the [integration quick start instructions](https://www.elastic.co/guide/en/apm/guide/current/apm-quick-start.html#add-apm-integration) for details.

To configure apm server create a `apm-server.source.yml` configuration file like this expose its metrics for collection by standalone metricbeat:

```yaml
http.enabled: true
http.port: 5068

output.elasticsearch:
  hosts: ["localhost:9200"]
  username: "elastic"
  password: "changeme"
```

You can also include a `monitoring` with an optional `cluster_uuid` setting which will presume you're shipping direct to the [monitoring deployment](../reference/terminology.md#monitoring-deployment). This is the same behavior as filebeat/metricbeat.

And start it with:

```shell
./apm-server -c apm-server.source.yml -e -d "*"
```

Note that on cloud the APM server section will show up as "Integrations Server" (previously "APM & Fleet"), but the code paths are the same.

## Logstash

Download a prebuilt logstash binary at the [preview release page](https://www.elastic.co/downloads/logstash#preview-release) or run a source build by following [the developers guide](https://github.com/elastic/logstash#developing-logstash-core).

Create a `logstash.dev.conf` with the following configuration:

```
input {
  java_generator {
    eps => 1
  }
}
output {
  elasticsearch {
    hosts => ["http://localhost:9200"]
    user => elastic
    password => changeme
  }
}
```

then start logstash:

```shell
bin/logstash --config.reload.automatic --enable-local-plugin-development \
   -f logstash.dev.conf
```

By default, it will open a port for metricbeat to collect metrics.

To enable internal collection, add the following to `config/logstash.yml`. Remove the SSL information if your ES is running without SSL.

```
xpack.monitoring.enabled: true
xpack.monitoring.collection.pipeline.details.enabled: true
xpack.monitoring.elasticsearch.username: elastic
xpack.monitoring.elasticsearch.password: changeme
xpack.monitoring.elasticsearch.hosts: ["http://localhost:9200"]
```

### Direct reporting of internal monitoring data

While undocumented, logstash also supports a direct monitoring mode using these settings ([code](https://github.com/elastic/logstash/blob/e11d0364d4b3d3722d152ae9ef86d41265c9d879/x-pack/lib/monitoring/monitoring.rb#L226-L228))

```
monitoring.enabled: true
monitoring.elasticsearch.hosts: https://localhost:9200
monitoring.elasticsearch.username: elastic
monitoring.elasticsearch.password: changeme
```

Any active elasticsearch output will be checked for it's UUID ([code](https://github.com/elastic/logstash/blob/e11d0364d4b3d3722d152ae9ef86d41265c9d879/logstash-core/lib/logstash/java_pipeline.rb#L329)) and monitoring documents will be indexed for each cluster.

### Pipeline versioning

You can test pipeline versioning by simply adding a filter to your config:

```
filter {
  mutate {
    id => "add_metadata"
    add_field => { "metadata" => "some metadata" }
  }
}
```

The new version should appear in stack monitoring within the next 10s-20s.

Note that this won't work if you're using a `stdin` input. If you need to feed messages to logstash manually while testing reloading, use a `file` input and write to the given file.

## Enterprise search

So far it seems the easiest way to run enterprise search is via the docker container.

### "Internal" metricbeat

These instructions enable monitoring using a version of metricbeat that is packaged along with enterprise search.

First add `enterpriseSearch.host: 'http://localhost:3002'` to your Kibana config to enable the enterprise search UI.

Then run the container. Note that this includes a `kibana.host` setting which may vary depending on your base path:

```
docker run --name entsearch --rm \
  -p 3002:3002 \
  -e elasticsearch.host='http://host.docker.internal:9200' \
  -e elasticsearch.username=elastic \
  -e elasticsearch.password=changeme \
  -e allow_es_settings_modification=true \
  -e kibana.host='http://host.docker.internal:5601/ftw' \
  -e monitoring.reporting_enabled=true \
  -e secret_management.encryption_keys='[4a2cd3f81d39bf28738c10db0ca782095ffac07279561809eecc722e0c20eb09]' \
  docker.elastic.co/enterprise-search/enterprise-search:master-SNAPSHOT
```

Once you open the enterprise search UI, you can create the demo engine to get that value saying "1" on the cluster overview page in stack monitoring.

### External metricbeat

WIP - this should be possible now that https://github.com/elastic/kibana/issues/121975 is resolved, but steps haven't been written yet.
