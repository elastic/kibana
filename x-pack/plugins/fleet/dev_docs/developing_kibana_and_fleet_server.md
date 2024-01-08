# Developing Kibana and Fleet Server simulatanously

Many times, a contributor to Fleet will only need to make changes to [Fleet Server](https://github.com/elastic/fleet-server) or [Kibana](https://github.com/elastic/kibana) - not both. But, there are times when end-to-end changes across both componenents are necessary. To facilitate this, we've created a guide to help you get up and running with a local development environment that includes both Kibana and Fleet Server. This is a more involved process than setting up either component on its own.

This guide seeks to get you up and running with the following stack components for local development:

- Kibana (from source)
- Elasticsearch (from a snapshot)
- Fleet Server (from source, in standalone mode)

Getting this development environment up and running will allow you to make changes to both Kibana and Fleet Server simultaneously to develop and test features end-to-end.

Before continuing, please review the developer documentation for both Fleet Server and Kibana. Make sure your local workstation can run each service independently. This means setting up Go, Node.js, Yarn, resolving dependencies, etc.

- https://github.com/elastic/fleet-server?tab=readme-ov-file#development
- https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md

## Start up Kibana and Elasticsearch

1. Get a local Kibana checkout up and running by following [the developer guide](https://docs.elastic.dev/kibana-dev-docs/getting-started/setup-dev-env) (internal Elastic employee link for now). Run the commands below from your `kibana` directory
2. Run a local Elasticsearch server from the latest snapshot build by running:

```bash
# Enable SSL + set a data path to prevent blowing away your Elasticsearch data between server restarts
$ yarn es snapshot --license trial --ssl -E path.data=/tmp/es-data
```

1. Add the following to your `kibana.dev.yml`

```bash
server.basePath: '/some-base-path' # Optional
server.versioned.versionResolution: oldest
elasticsearch.hosts: [<http://localhost:9200>]

# Optional - set up an APM service in a cloud.elastic.co cluster to send your dev logs, traces, etc
# Can be helpful for troubleshooting and diagnosting performance issues
# elastic.apm:
  # active: true
  # serverUrl: <https://some-cluster.apm.us-east4.gcp.elastic-cloud.com:443>
  # secretToken: some-token
  # breakdownMetrics: true
  # transactionSampleRate: 0.1

logging:
  loggers:
    - name: plugins.fleet
      appenders: [console]
      level: debug

# Allows enrolling agents when standalone Fleet Server is in use
xpack.fleet.internal.fleetServerStandalone: true

xpack.fleet.fleetServerHosts:
  - id: localhost
    name: Localhost
    # Make sure this is `https` since we're running our local Fleet Server with SSL enabled
    host_urls: ['<https://localhost:8220>']
 # If you want to run a Fleet Server in Docker, use this Fleet Server host
  - id: docker
    name: Docker Internal Gateway
    host_urls: ['<https://host.docker.internal:8220>']
    is_default: true

xpack.fleet.packages:
  - name: fleet_server
    version: latest

xpack.fleet.outputs:
  - id: preconfigured-localhost-output
    name: Localhost Output
    type: elasticsearch
    hosts: ['<https://localhost:9200>']
    ca_trusted_fingerprint: 'f71f73085975fd977339a1909ebfe2df40db255e0d5bb56fc37246bf383ffc84'
    is_default: true

  # If you enroll agents via Docker, use this output so they can output to your local
  # Elasticsearch cluster
  - id: preconfigured-docker-output
    name: Docker Output
    type: elasticsearch
    hosts: ['<https://host.docker.internal:9200>']
    ca_trusted_fingerprint: 'f71f73085975fd977339a1909ebfe2df40db255e0d5bb56fc37246bf383ffc84'

xpack.fleet.agentPolicies:
  - name: Fleet Server Policy
    id: fleet-server-policy
    is_default_fleet_server: true
    package_policies:
      - package:
          name: fleet_server
        name: Fleet Server
        id: fleet_server
        inputs:
          - type: fleet-server
            keep_enabled: true
            vars:
              - name: host
                value: 0.0.0.0
                frozen: true
              - name: port
                value: 8220
                frozen: true
```

1. Start up Kibana by running the following in another terminal session:

```bash
$ yarn start --ssl
```

1. Navigate to https://localhost:5601/app/fleet and click "Add Fleet Server"
2. Select your localhost Fleet Server host and generate a service token
3. Copy the service token somewhere convenient - you'll need it to run Fleet Server below

## Start up Fleet Server

These instructions assume you're currently in your local `fleet-server` checkout directory.

1. Create a `fleet-server.dev.yml` file if one doesn't exist. This file is git ignored, so we can make our configuration changes directly instead of having to use environment variables or accidentally tracking changes to `fleet-server.yml`.

```bash
$ cp fleet-server.yml fleet-server.dev.yml
```

1. Update your `fleet-server.dev.yml` to look as follows

```yaml
# This config is intended to be used with a stand-alone fleet-server instance for development.
output:
  elasticsearch:
    hosts: '<https://localhost:9200>'
    # Copy the service token from the Fleet onboarding UI in Kibana
    service_token: 'your_service_token'
    # Fingerprint of the ca.crt certificate in Kibana's dev utils package
    ssl.ca_trusted_fingerprint: 'f71f73085975fd977339a1909ebfe2df40db255e0d5bb56fc37246bf383ffc84'

fleet:
  agent:
    id: '${FLEET_SERVER_AGENT_ID:dev-fleet-server}'

inputs:
  - type: fleet-server
    policy.id: '${FLEET_SERVER_POLICY_ID:fleet-server-policy}'
    server:
      ssl:
        enabled: true
        certificate: ../kibana/packages/kbn-dev-utils/certs/fleet_server.crt
        key: ../kibana/packages/kbn-dev-utils/certs/fleet_server.key
        key_passphrase: ../kibana/packages/kbn-dev-utils/certs/fleet_server.key

logging:
  to_stderr: true # Force the logging output to stderr
  pretty: true
  level: '${LOG_LEVEL:DEBUG}'

# Enables the stats endpoint under <http://localhost:5601> by default.
# Additional stats can be found under <http://127.0.0.1:5066/stats> and <http://127.0.0.1:5066/state>
http.enabled: true
#http.host: <http://127.0.0.1>
#http.port: 5601
```

```bash
# Create standalone dev build
$ DEV=true SNAPSHOT=true make release-darwin/amd64

# Run dev build, provide your fingerprint and service token from before
$ ELASTICSEARCH_CA_TRUSTED_FINGERPRINT="f71f73085975fd977339a1909ebfe2df40db255e0d5bb56fc37246bf383ffc84" ELASTICSEARCH_SERVICE_TOKEN="AAEAAWVsYXN0aWMvZmxlZXQtc2VydmVyL3Rva2VuLTE3MDQ0Njk3NTc4Mjk6dDhWaVl5Qy1SQ0taTjRRYzdibUx4UQ" FLEET_SERVER_POLICY_ID="fleet-server-policy" ./build/binaries/fleet-server-8.13.0-SNAPSHOT-darwin-x86_64/fleet-server -c fleet-server.yml

```

Once your Fleet Server is online, you should be able to refresh your Kibana UI and begin enrolling agents. Note that you won't see your Fleet Server in the `agents` list, because it's running in standalone mode and thus is not running Elastic Agent.

## Enroll agents

Now that you have Kibana + Elasticsearch + Fleet Server all up and running, you can enroll agents. The quickest way to enroll an agent is by using the bash script below to spin up agents in Docker containers:

```bash
#!/usr/bin/env bash

# Copy this script somehwere convenient, and name it `run_dockerized_elastic_agent.sh`. Make sure to `chmod +x` this file as well.

# This script is used to run a instance of Elastic Agent in a Docker container.
# Ref.: <https://www.elastic.co/guide/en/fleet/current/elastic-agent-container.html>

# To run a Fleet server: ./run_dockerized_elastic_agent.sh fleet_server -e <service_token> -v <version> -t <tags>
# To run an agent: ./run_dockerized_elastic_agent.sh agent -e <enrollment token> -v <version> -t <tags>

# NB: this script assumes a Fleet server policy with id "fleet-server-policy" is already created.

CMD=$1

while [ $# -gt 0 ]; do
  case $1 in
    -e | --enrollment-token) ENROLLMENT_TOKEN=$2 ;;
    -v | --version) ELASTIC_AGENT_VERSION=$2 ;;
    -t | --tags) TAGS=$2 ;;
  esac
  shift
done

DEFAULT_ELASTIC_AGENT_VERSION=8.13.0-SNAPSHOT # Update as needed when new versions are available

# Needed to run Dockerized Fleet Server - note that we're not running over SSL in this case
ELASTICSEARCH_HOST=http://host.docker.internal:9200 # should match Fleet settings or xpack.fleet.agents.elasticsearch.hosts in kibana.dev.yml
KIBANA_HOST=http://host.docker.internal:5601
KIBANA_BASE_PATH=my_base_path # should match server.basePath in kibana.dev.yml if you've set one
FLEET_SERVER_POLICY_ID=fleet-server-policy # as defined in kibana.dev.yml

# Needed for agent - make sure this `https` if you're running everything over SSL as this guide instructs.
FLEET_SERVER_URL=https://host.docker.internal:8220

printArgs() {
  if [[ $ELASTIC_AGENT_VERSION == "" ]]; then
    ELASTIC_AGENT_VERSION=$DEFAULT_ELASTIC_AGENT_VERSION
    echo "No Elastic Agent version specified, setting to $ELASTIC_AGENT_VERSION (default)"
  else
    echo "Received Elastic Agent version $ELASTIC_AGENT_VERSION"
  fi

  if [[ $ENROLLMENT_TOKEN == "" ]]; then
    echo "Warning: no enrollment token provided!"
  else
    echo "Received enrollment token: ${ENROLLMENT_TOKEN}"
  fi

  if [[ $TAGS != "" ]]; then
    echo "Received tags: ${TAGS}"
  fi
}

echo "--- Elastic Agent Container Runner ---"

if [[ $CMD == "fleet_server" ]]; then
  echo "Starting Fleet Server container..."

  printArgs

  docker run \\
    -e ELASTICSEARCH_HOST=${ELASTICSEARCH_HOST} \\
    -e KIBANA_HOST=${KIBANA_HOST}/${KIBANA_BASE_PATH} \\
    -e KIBANA_USERNAME=elastic \\
    -e KIBANA_PASSWORD=changeme \\
    -e KIBANA_FLEET_SETUP=1 \\
    -e FLEET_INSECURE=1 \\
    -e FLEET_SERVER_ENABLE=1 \\
    -e FLEET_SERVER_POLICY_ID=${FLEET_SERVER_POLICY_ID} \\
    -e ELASTIC_AGENT_TAGS=${TAGS} \\
    -p 8220:8220 \\
    --rm docker.elastic.co/beats/elastic-agent:${ELASTIC_AGENT_VERSION}

elif [[ $CMD == "agent" ]]; then
  echo "Starting Elastic Agent container..."

  printArgs

  docker run \\
    -e FLEET_URL=${FLEET_SERVER_URL} \\
    -e FLEET_ENROLL=1 \\
    -e FLEET_ENROLLMENT_TOKEN=${ENROLLMENT_TOKEN} \\
    -e FLEET_INSECURE=1 \\
    -e ELASTIC_AGENT_TAGS=${TAGS} \\
    --rm docker.elastic.co/beats/elastic-agent:${ELASTIC_AGENT_VERSION}

elif [[ $CMD == "help" ]]; then
  echo "Usage: ./run_elastic_agent.sh <agent/fleet_server> -e <enrollment token> -v <version> -t <tags>"

elif [[ $CMD == "" ]]; then
  echo "Command missing. Available commands: agent, fleet_server, help"

else
  echo "Invalid command: $CMD"
fi
```

Another option is to use a lightweight virtualization provider like https://multipass.run/ and enrolling agents using an enrollment token generated via Fleet UI. You will need to add a Fleet Server Host entry + Output to your Fleet settings that corresponds with your Multipass bridge network interface, similar to how we've set up Docker above.

_To do: add specific docs for enrolling Multipass agents and link here_
