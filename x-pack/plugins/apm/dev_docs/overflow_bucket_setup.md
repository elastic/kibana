# Table of contents
1. [Summary](#summary)
2. [Start stack using Tilt](#Tilt)
3. [Start stack manually](#manually)

## Summary

8.7 introduced Overflow Buckets for Metrics. The below setup would enable generating the overflow buckets for the metrics indices.

## Start stack using Tilt

With a 1GB server, MaxTransactionGroups is 5000 and MaxServices is 1000. Per-service max transaction groups is hardcoded as 10% of max transaction groups, i.e. 500.

### Pre-requisites
1. Install golang and set go path properly
2. Clone [Apm-server](https://github.com/elastic/apm-server/tree/main) repository
3. Install [Docker](https://www.docker.com/products/docker-desktop/).
4. Install [Tilt](https://docs.tilt.dev/install.html).
5. Execute `tilt up` in the root of the repository. This will start an APM server, an es and a kibana for you. You can verify the status of the components accessing [http://localhost:10350/](http://localhost:10350/).

For more detailed instructions you can check [apm-server dev documentation](https://github.com/elastic/apm-server/blob/main/dev_docs/TESTING.md#tilt--kubernetes).

### Steps to generate data
- Copy paste the below script in a file called `load_generator.go`
<details>
  <summary>load_generator.go</summary>
  
  ```go
  package main

  import (
    "fmt"
    "os"
    "strconv"
    "time"

    "go.elastic.co/apm/v2"
  )

  func main() {
    tracer := apm.DefaultTracer()
    g, err := strconv.Atoi(os.Getenv("TXGROUPS"))
    if err != nil {
      panic(err)
    }
    for i := g; i >= 1; i-- {
      once(tracer, fmt.Sprintf("type%d", i))
      time.Sleep(time.Millisecond)
    }
    tracer.Flush(nil)
    fmt.Println("ok finished publishing ", g)
  }

  func once(tracer *apm.Tracer, name string) {
    tx := tracer.StartTransaction("txname", name)
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
</details>

#### Overflow buckets for transactions
- Create a Bash Script file in order to test overflow bucket with transactions, name it anything - e.g., `generator_tx_max.sh`. Note that this test will generate 600 TxGroups which exceeds the known limit of 500
<details>
  <summary>generator_tx_max.sh</summary>

  ```sh
  #!/usr/bin/env bash

  echo "Starting script"

  go build -o load-generator load-generator.go || exit 1

  ELASTIC_APM_SERVICE_NAME="fixed" TXGROUPS="600" ./load-generator &

  wait

  echo "Ending script"
  ```
</details>

- Run `sh generator_tx_max` to generate the data

#### Overflow buckets for services
- Create a Bash Script file in order to test overflow bucket with transactions, name it anything - e.g., `generator_service_max.sh`. Note that this test will generate 2000 services which exceeds the known limit of 1000
<details>
  <summary>generator_service_max.sh</summary>

  ```sh
  #!/usr/bin/env bash

  echo "Starting script"

  go build -o load-generator load-generator.go || exit 1

  for i in {1..2000}
  do
      ELASTIC_APM_SERVICE_NAME="random$i" TXGROUPS="5" ./load-generator  &
  done

  wait

  echo "Ending script"
  ```
</details>

- Run `sh generator_service_max` to generate the data

## Start stack manually

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
  ```yml
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

<details>
  <summary>tx_max_group.go</summary>

  ```go
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
</details>

- Now create a Bash Script file, name it anything - e.g., `service_max_group.sh`
  This file will generate services and then transactions for each service using the go script above.

<details>
  <summary>tx_max_group.go</summary>

  ```sh
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
</details>

- Run `sh service_max_group` to generate the data

This would start generating events to APM Server. Now open Service Inventory Page on Kibana to observe the `_other` bucket.

### Known Issues

- APM Server is unable to use Fleet API to generate APM Indices. Due to this, when starting the APM Server, you will see errors like unable to find Metrics Indices. To fix this, run one of the Synthtrace Scenario files which would create the required indices.
  ```
  node scripts/synthtrace mobile.ts --clean
  ```