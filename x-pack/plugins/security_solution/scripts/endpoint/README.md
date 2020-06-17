# Resolver Generator Script

This script makes it easy to create the endpoint metadata, alert, and event documents needed to test Resolver in Kibana.
The default behavior is to create 1 endpoint with 1 alert and a moderate number of events (random, typically on the order of 20).
A seed value can be provided as a string for the random number generator for repeatable behavior, useful for demos etc.
Use the `-d` option if you want to delete and remake the indices, otherwise it will add documents to existing indices.

The sample data generator script depends on ts-node, install with npm:

`npm install -g ts-node`

Example command sequence to get ES and kibana running with sample data after installing ts-node:

`yarn es snapshot` -> starts ES

`npx yarn start --xpack.securitySolution.enabled=true --no-base-path` -> starts kibana

`cd ~/path/to/kibana/x-pack/plugins/endpoint`

`yarn test:generate --auth elastic:changeme` -> run the resolver_generator.ts script

Resolver generator CLI options:

```bash
Options:
  --help                         Show help                             [boolean]
  --seed, -s                     random seed to use for document generator
                                                                        [string]
  --node, -n                     elasticsearch node url
                    [string] [default: "http://elastic:changeme@localhost:9200"]
  --kibana, -k                   kibana url
                    [string] [default: "http://elastic:changeme@localhost:5601"]
  --eventIndex, --ei             index to store events in
                                         [string] [default: "events-endpoint-1"]
  --metadataIndex, --mi          index to store host metadata in
                       [string] [default: "metrics-endpoint.metadata-default-1"]
  --policyIndex, --pi            index to store host policy in
                         [string] [default: "metrics-endpoint.policy-default-1"]
  --ancestors, --anc             number of ancestors of origin to create
                                                           [number] [default: 3]
  --generations, --gen           number of child generations to create
                                                           [number] [default: 3]
  --children, --ch               maximum number of children per node
                                                           [number] [default: 3]
  --relatedEvents, --related     number of related events to create for each
                                 process event             [number] [default: 5]
  --relatedAlerts, --relAlerts   number of related alerts to create for each
                                 process event             [number] [default: 5]
  --percentWithRelated, --pr     percent of process events to add related events
                                 and related alerts to    [number] [default: 30]
  --percentTerminated, --pt      percent of process events to add termination
                                 event for                [number] [default: 30]
  --maxChildrenPerNode, --maxCh  always generate the max number of children per
                                 node instead of it being random up to the max
                                 children             [boolean] [default: false]
  --numHosts, --ne               number of different hosts to generate alerts
                                 for                       [number] [default: 1]
  --numDocs, --nd                number of metadata and policy response doc to
                                 generate per host         [number] [default: 5]
  --alertsPerHost, --ape         number of resolver trees to make for each host
                                                           [number] [default: 1]
  --delete, -d                   delete indices and remake them
                                                      [boolean] [default: false]
```
