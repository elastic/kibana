# Entity Store Transforms & Kibana Task Implementation Prototype

> Note this code is designed to be thrown away is is by no means production ready! 

this prototype creates a basic entity store which combines data seen in the `logs-*` index pattern with asset criticality data to form basic entities. 

Some key limitations to start with:

- only extracts host entities
- very limited field set, only host name, first seen, last seen, an IP history and asset criticality are currently stored

The transform takes log data and uses a scripted metric aggregation to create "composites" these are 1 minute snapshots of an entity, with all IPs seen during that time, here is an example composite document from `.entities.entity-composites.*`

```
{
    "@timestamp": 1707237480000,
    "type": "host",
    "host": {
        "name": "host-1"
    },
    "first_doc_timestamp": "2024-02-06T16:38:54.000Z",
    "last_doc_timestamp": "2024-02-06T16:38:59.000Z"
    "entity": {
        "ip_history": [
            {
              "ip": "2.2.2.2",
              "timestamp": "2024-02-06T16:38:56.000Z"
            },
            {
              "ip": "1.1.1.1",
              "timestamp": "2024-02-06T16:38:54.000Z"
            }
        ],
    }
}
```

This is then consumed by the kibana task and the entity in the entity store is created or updated. The entity store is currently `.entities.entities-default` Here is an example entity:

```
{
  "@timestamp": "2024-02-06T17:02:38.759Z",
  "entity_type": "host",
  "first_seen": "2024-02-06T17:00:59.000Z",
  "last_seen": "2024-02-06T17:00:59.000Z",
  "host": {
    "name": "host-1",
    "ip_history": [
        {
          "ip": "2.2.2.2",
          "timestamp": "2024-02-06T16:38:56.000Z"
        },
        {
          "ip": "1.1.1.1",
          "timestamp": "2024-02-06T16:38:54.000Z"
        }
    ],
  }
}
```

## How to get the demo working

### 1. Get Elasticsearch running from source

This prototype requires a custom branch of elasticsearch in order to give the kibana system user more privileges. 

#### Step 1 - Clone the prototype branch

The elasticsearch branch is at https://github.com/elastic/elasticsearch/tree/entity-store-permissions. 

Or you can use [github command line](https://cli.github.com/) to checkout my draft PR:

```
gh pr checkout 105201
```

#### Step 2 - Install Java

Install [homebrew](https://brew.sh/) if you do not have it.

```
brew install openjdk@17

sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
```

#### Step 3 - Run elasticsearch

This makes sure your data stays between runs of elasticsearch
```
./gradlew run --data-dir /tmp/elasticsearch-repo --preserve-data
```

### 2. Get Kibana & The Transforms Running

#### Step 1 - Connect kibana to elasticsearch

We need to connect your local kibana to the elasticsearch you have just started. I have created a script which generates a service token and adds it to your kibana config, then changes the kibana user password from "password" to "changeme" to make life easier. 

```
# Change the path to match your kibana config!
# Only tested on Mac
./dev_scripts/get_service_token.sh /Users/mark/dev/kibana/config/kibana.dev.yml
```

Now start kibana and you should have connected to the elasticsearch you made.

#### Step 2 - Start the transform and task

Calling the entity store init API will create and start the transform and kibana task.

```
# You will need to change the base path according to your local kibana!
curl elastic:changeme@localhost:5601/mark/internal/entity_store/init \
  -H 'kbn-xsrf:bleh' \
  -X 'POST' \
  -H 'elastic-api-version: 1'
```

you should now see the transform running in kibana.

### 3 - Load some test data

#### Option 1 - load some log data

> It can take a couple of minutes for the transform to pick up the new documents event though it runs every minute, so be patient!

Load some log data with IPs, use the handy script I created `./dev_scripts/host_ip_docgen.sh`. For example:

```
./dev_scripts/host_ip_docgen.sh host-1 10 1
```

Will create 10 log documents 1 second apart, in `logs-testdata-default` with host.ips starting at 1.1.1.1 and ending with 10.10.10.10

You could then run this again:

```
./dev_scripts/host_ip_docgen.sh host-1 10 11
```

Will create another 10 log documents in `logs-testdata-default` with host.ips starting at 11.11.11.11 and ending with 20.20.20.20.

This is a good way of testing the IP history feature. 

#### Option 2 - load an asset criticality

> criticality is much quicker to run as it is picked up directly by the task

Changing an asset criticality will change the entity in the entity store.

```
./dev_scripts/create_criticality.sh --kibana_url elastic:changeme@localhost:5601/mark --type host --id host-1 --criticality_level important
```

### Troubleshooting and diagnostics

#### When developing the task why wont it run??

I noticed that the task would take 10 mins to run on kibana startup, this was because when I was saving the code, kibana would instantly abort and restart leaving the task in a hung state, it takes 10 mins to re-run. 

Run the following scripts to reset the task state:

```
./dev_scripts/create_superuser.sh
./dev_scripts/reset_task.sh
```

### Dev tools commands to see the composites and entity store

```
GET /.entities.entity-composites.*/_search?size=1
{
  "sort": [
    {
      "@timestamp": {
        "order": "desc"
      }
    }
  ]
}

GET /.entities.entities-default/_search
```