## Summary

8.7 introduced Overflow Buckets for Metrics. The below setup would enable generating the overflow buckets for the metrics indices.

### Pre-requisites

- Install golang and set go path properly

- Run Elasticsearch locally
  ```
  yarn es snapshot
  ```
- Run Kibana locally
  ```
  yarn start
  ```
- Git Clone APM Server locally
  ```
  git clone git@github.com:[USER]/apm-server.git
  ```
- Modify `apm-server.yml` accordingly
  ```
  ## Add this to the bottom of the file
  apm-server.aggregation:
  service_transactions:
    max_groups: 2
  transactions:
    max_groups: 2
  
  ## Uncomment the following lines under `output.elasticsearch:`
  username: "elastic"
  password: "changeme"
  protocol: "http" // This is by default set to HTTPS, change it to http
  ```
- Run APM Server locally
  ```
  ./apm-server -c apm-server.yml -e -d "*"
  ```
  
### Steps to generate data

- Copy paste the below script in a file called `tx_max_group.go`
  This file is responsible for generating 3 transactions per service.
  ```
  package main

  import (
    "fmt"
    "time"
    "go.elastic.co/apm/v2"
  )
  
  func main() {
    tracer := apm.DefaultTracer()
    once(tracer, "test1")
    once(tracer, "test2")
    once(tracer, "test3")
    tracer.Flush(nil)
  }
  
  func once(tracer *apm.Tracer, name string) {
    tx := tracer.StartTransaction(name, "type")
    defer tx.End()
  
    span := tx.StartSpanOptions(name, "type", apm.SpanOptions{})
    time.Sleep(time.Millisecond * 1)
  
    span.Outcome = "success"
    span.Context.SetDestinationService(apm.DestinationServiceSpanContext{
      Resource: fmt.Sprintf("dest_resource"),
    })
    span.End()
  }
  ```
  
- Now create a Bash Script file, name it anything - e.g., `service_max_group.sh`
  This file will generate services and then transactions for each service using the go script above.
  ```
  #!/usr/bin/env bash

  echo "Starting script"
  
  go build -o tx_max_group tx_max_group.go || exit 1
  
  for i in {1..10100}
  do
  export ELASTIC_APM_SERVICE_NAME="service-$i"
  ./tx_max_group
  done
  
  echo "Ending script"
  ```

- Run `sh service_max_group` to generate the data

This would start generating events to APM Server. Now open Service Inventory Page on Kibana to observe the `_other` bucket.

## Known Issues

- APM Server is unable to use Fleet API to generate APM Indices. Due to this, when starting the APM Server, you will see errors like unable to find Metrics Indices. To fix this, run one of the Synthtrace Scenario files which would create the required indices.
  ```
  node scripts/synthtrace mobile.ts --clean
  ```