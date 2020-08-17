# Resolver Generator Script

This script makes it easy to create the endpoint metadata, alert, and event documents needed to test Resolver in Kibana.
The default behavior is to create 1 endpoint with 1 alert and a moderate number of events (random, typically on the order of 20).
A seed value can be provided as a string for the random number generator for repeatable behavior, useful for demos etc.
Use the `-d` option if you want to delete and remake the indices, otherwise it will add documents to existing indices.

The sample data generator script depends on ts-node, install with npm:

`npm install -g ts-node`

Example command sequence to get ES and kibana running with sample data after installing ts-node:

`yarn es snapshot` -> starts ES

`npx yarn start --no-base-path` -> starts kibana. Note: you may need other configurations steps to start the security solution with endpoint support.

`cd x-pack/plugins/security_solution/scripts/endpoint`

`yarn test:generate` -> run the resolver_generator.ts script

To see Resolver generator CLI options, run `yarn test:generate --help`.
