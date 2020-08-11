# Load testing fleet

## Getting started
Start Elasticsearch:
```
ulimit -n 10000
yarn run  es snapshot --ssl
```

Start Kibana like so:
```
ulimit -n 10000
node --inspect scripts/kibana --dev --no-base-path --no-watch
```

wait for it to boot. Navigate to https://localhost:5601/app/monitoring and set up stack monitoring so we can follow the metrics during the test.

Then navigate to https://localhost:5601/app/ingestManager#/ and grab the token from the Agent enrollment flyout. If it ends in `==` make sure you include them in when you copy/paste it. 

## Load testing with 'loadtest'

[Loadtest](https://github.com/roncohen/loadtest) is a crude tool that helps you simulate a number of agents from a single Go program. For more advanced and bigger scale tests, see https://github.com/elastic/horde.

Do a checkout of https://github.com/roncohen/fleet-loadtest then start it like so:

```
ulimit -n 10000
HOST=https://localhost:5601 TOKEN=<TOKEN> RATE=30 AGENTS=1000 go run main.go
```
See the [loadtest README](https://github.com/roncohen/fleet-loadtest#loadtest) for more information.

Navigate to [chrome://inspect](chrome://inspect) and from there you can get a live profile.

## Options to tweak

Here are things you can tweak in Kibana when testing:
```
server.socketTimeout: 265000  # basic socket timeout, should be higher that the setting below
xpack.ingestManager.fleet.pollingRequestTimeout: 250000  # long polling period
xpack.ingestManager.fleet.maxConcurrentConnections: 4   # max concurrent enrollment requests accepted
xpack.ingestManager.fleet.agentConfigRolloutRateLimitRequestPerInterval: 1  # decides the rate at which agent policy changes will be rolled out, along with the option below
xpack.ingestManager.fleet.agentConfigRolloutRateLimitIntervalMs: 1000  
```