Script for ad-hoc benchmarks of APM endspoints in Kibana

### Getting started

**Install dependencies**

```
yarn
```

**Configuration**

Create a `.env` file in the root:

```yml
USERNAME="admin"
PASSWORD="verysecret"
ES_HOST ="https://abcdefg.us-west2.gcp.elastic-cloud.com:9243"

# page to visit
APM_URL="http://localhost:5601/app/apm/services?environment=ENVIRONMENT_ALL&rangeFrom=2022-03-15T23:00:00.000Z&rangeTo=2022-03-16T23:00:00.000Z"

# Number of times to visit page
NUMBER_OF_RUNS=50
```

**Start script**

Start Kibana, then run the benchmarking script

```
yarn start
```

### Result

After running for the specified number of iterations, the average "endTime" for each APM request will be outputted

<details>
  <summary>Show sample output</summary>
  
  ```json
  [
    {
      "name": "http://localhost:5601/internal/apm/sorted_and_filtered_services",
      "avgEndTime": 9862
    },
    {
      "name": "http://localhost:5601/internal/apm/services",
      "avgEndTime": 11744
    },
    {
      "name": "http://localhost:5601/internal/apm/services/detailed_statistics",
      "avgEndTime": 16135
    }
  ]
  ```
</details>
