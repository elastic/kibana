# Sample kibana.dev.yml for Fleet development

```yml
# =================== System: Kibana Server ===================

# Specifies a path to mount Kibana at.
server.basePath: /yourname # <--- CHANGE ME
# Specifies the address to which the Kibana server will bind.
server.host: 0.0.0.0 # Fleet Server default host
# Provides an API version. Set to 'oldest' in stateful mode, 'newest' in serverless mode.
server.versioned.versionResolution: oldest

# =================== System: Elasticsearch ===================

# The URLs of the Elasticsearch instances.
elasticsearch.hosts: [http://localhost:9200]

# =================== System: Logging ===================

logging:
  loggers:
    - name: plugins.fleet
      appenders: [console]
      level: debug
    # Logs queries sent to Elasticsearch.
    # - name: elasticsearch.query
    #   level: debug

# =================== Fleet Settings ===================

# Official Fleet settings documentation: https://www.elastic.co/guide/en/kibana/current/fleet-settings-kb.html
# FleetConfigType definition: https://github.com/elastic/kibana/blob/main/x-pack/plugins/fleet/common/types/index.ts
# PluginConfigDescriptor definition: https://github.com/elastic/kibana/blob/main/x-pack/plugins/fleet/server/config.ts

# xpack.fleet.registryUrl: https://localhost:8080

# xpack.fleet.enableExperimental: []

# Allows enrolling agents when standalone Fleet Server is in use
# xpack.fleet.internal.fleetServerStandalone: true

xpack.fleet.fleetServerHosts:
  # ID must be default-fleet-server if running in serverless mode
  - id: default-fleet-server
    name: Default Fleet server
    is_default: true
    host_urls: ['https://<FLEET-SERVER-VM-IP>:8220'] # For running a Fleet Server in a VM <--- CHANGE ME
    # host_urls: ['https://host.docker.internal:8220'] # For running a Fleet Server Docker container

xpack.fleet.outputs:
  # ID must be es-default-output if running in serverless mode
  - id: es-default-output
    name: Default output
    type: elasticsearch
    is_default: true
    is_default_monitoring: true
    hosts: ['http://<YOUR-LOCAL-IP>:9200'] # For enrolling agents on VM <--- CHANGE ME
    # hosts: ['http://host.docker.internal:9200'] # For enrolling dockerized agents

xpack.fleet.packages:
  - name: fleet_server
    version: latest

xpack.fleet.agentPolicies:
  - name: Fleet Server policy
    id: fleet-server-policy
    is_default_fleet_server: true
    # is_managed: true # Useful to mimic cloud environment
    description: Fleet server policy
    namespace: default
    package_policies:
      - name: Fleet Server
        id: fleet_server
        package:
          name: fleet_server
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
