This script makes it easy to create the endpoint metadata, alert, and event documents needed to test Resolver in Kibana.
The default behavior is to create 1 endpoint with 1 alert and a moderate number of events (random, typically on the order of 20). **THE EVENT AND METADATA INDICES WILL BE DELETED AND REMADE BEFORE INSERTING.**
A seed value can be provided as a string for the random number generator for repeatable behavior, useful for demos etc.

The sample data generator script depends on ts-node, install with npm:

```npm install -g ts-node```

Example command sequence to get ES and kibana running with sample data after installing ts-node:

```yarn es snapshot``` -> starts ES

```npx yarn start --xpack.endpoint.enabled=true --no-base-path``` -> starts kibana

```cd ~/path/to/kibana/x-pack/plugins/endpoint```

```yarn test:generate --auth elastic:changeme``` -> run the resolver_generator.ts script

Resolver generator CLI options:
```--help                      Show help                                [boolean]
  --seed, -s                  random seed to use for document generator [string]
  --node, -n                  elasticsearch node url
                                     [string] [default: "http://localhost:9200"]
  --eventIndex, --ei          index to store events in
                                         [string] [default: "events-endpoint-1"]
  --metadataIndex, --mi       index to store endpoint metadata in
                                          [string] [default: "endpoint-agent-1"]
  --auth                      elasticsearch username and password, separated by
                              a colon                                   [string]
  --ancestors, --anc          number of ancestors of origin to create
                                                           [number] [default: 3]
  --generations, --gen        number of child generations to create
                                                           [number] [default: 3]
  --children, --ch            maximum number of children per node
                                                           [number] [default: 3]
  --relatedEvents, --related  number of related events to create for each
                              process event                [number] [default: 5]
  --percentWithRelated, --pr  percent of process events to add related events to
                                                          [number] [default: 30]
  --percentTerminated, --pt   percent of process events to add termination event
                              for                         [number] [default: 30]
  --numEndpoints, --ne        number of different endpoints to generate alerts
                              for                          [number] [default: 1]
  --alertsPerEndpoint, --ape  number of resolver trees to make for each endpoint
                                                           [number] [default: 1]```
