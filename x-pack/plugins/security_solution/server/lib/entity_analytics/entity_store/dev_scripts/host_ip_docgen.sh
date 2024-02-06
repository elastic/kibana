#!/bin/bash
function usage {
    echo "Generates log documents with a unique host.ip for a given host"
    echo "Usage: $0 <HOSTNAME> <DOC_COUNT> [START_INDEX]"
    echo "  HOSTNAME: The hostname of the host to generate documents for"
    echo "  DOC_COUNT: The number of documents to generate"
    echo "  START_INDEX: The starting index for the IP address. Defaults to 1 (1.1.1.1) if not provided"

    echo "Example: $0 host-1 20 1"
    exit 1
}

# Validate command line args
if [ "$#" -lt 2 ]; then
    usage
fi

# Command line args
HOSTNAME="$1"
DOC_COUNT="$2"
START_INDEX=${3:-1} 

# Not command line args
ELASTICSEARCH_URL="elastic:changeme@localhost:9200"
KIBANA_URL="elastic:changeme@localhost:5601/mark"
INDEX="logs-testdata-default"
SUCCESSFUL_DOC_COUNT=0
SLEEP=1

echo "Using Elasticsearch URL: $ELASTICSEARCH_URL"
echo "Using Kibana URL: $KIBANA_URL"

echo "REMEMBER TO EDIT KIBANA_URL BEFORE RUNNING FOR THE FIRST TIME :)"

for ((i=START_INDEX; i<=DOC_COUNT + START_INDEX - 1; i++)); do
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    IP_ADDRESS="$((i)).$((i)).$((i)).$((i))"

    JSON_DATA=$(cat <<EOF
{
  "agent": {
    "id": "15f99131-e3a7-4405-9ffc-9acb5acef277",
    "type": "endpoint",
    "version": "8.13.0"
  },
  "process": {
    "args": [
      "iexlorer.exe",
      "--cde"
    ],
    "Ext": {
      "ancestry": []
    },
    "group_leader": {
      "name": "fake leader",
      "pid": 668,
      "entity_id": "sfcwcmr8u8"
    },
    "session_leader": {
      "name": "fake session",
      "pid": 972,
      "entity_id": "sfcwcmr8u8"
    },
    "code_signature": {
      "subject_name": "Microsoft",
      "status": "trusted"
    },
    "entry_leader": {
      "name": "fake entry",
      "start": [
        "1970-01-01T00:00:00.000Z"
      ],
      "pid": 871,
      "entity_id": "sfcwcmr8u8"
    },
    "name": "iexlorer.exe",
    "pid": 753,
    "working_directory": "/home/damuedghkm/",
    "entity_id": "sfcwcmr8u8",
    "executable": "iexlorer.exe",
    "hash": {
      "md5": "b9e1af18-15fc-42f8-be6e-eba8d919d5c8"
    }
  },
  "@timestamp": "$TIMESTAMP",
  "ecs": {
    "version": "1.4.0"
  },
  "data_stream": {
    "namespace": "default",
    "type": "logs",
    "dataset": "endpoint.events.process"
  },
  "host": {
    "hostname": "$HOSTNAME",
    "os": {
      "Ext": {
        "variant": "Debian"
      },
      "kernel": "4.19.0-21-cloud-amd64 #1 SMP Debian 4.19.249-2 (2022-06-30)",
      "name": "Linux",
      "family": "debian",
      "type": "linux",
      "version": "10.12",
      "platform": "debian",
      "full": "Debian 10.12"
    },
    "ip": [
      "$IP_ADDRESS"
    ],
    "name": "$HOSTNAME",
    "id": "a7f90313-7262-467d-8aef-ae0551b9e2ee",
    "mac": [
      "4d-ce-ec-ac-4d-81"
    ],
    "architecture": "f1o6qgu0k8"
  },
  "event": {
    "agent_id_status": "auth_metadata_missing",
    "sequence": 0,
    "ingested": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "kind": "event",
    "id": "$(uuidgen)",
    "category": [
      "process"
    ],
    "type": [
      "start"
    ],
    "outcome": ""
  },
  "user": {
    "domain": "4vhdpyz72b",
    "name": "damuedghkm"
  }
}
EOF
)

    # echo "$JSON_DATA"
    curl -X POST -H "Content-Type: application/json" "$ELASTICSEARCH_URL/$INDEX/_doc" -d "$JSON_DATA"
    echo " $IP_ADDRESS"
    SUCCESSFUL_DOC_COUNT=$((SUCCESSFUL_DOC_COUNT + 1))
    sleep $SLEEP
done

# echo "Creating criticality record"

# criticality_data=$(cat <<EOF
# {
#     "id_field": "host.name",
#     "id_value": "$HOSTNAME",
#     "criticality_level": "very_important"
# }
# EOF
# ) 

# curl -s -X POST \
#   -H "Content-Type: application/json" \
#   -H "kbn-xsrf: hello" \
#   -H "elastic-api-version: 1" \
#   -d "$criticality_data" \
#   "$KIBANA_URL/internal/asset_criticality"

# echo ""

echo "Successfully created $SUCCESSFUL_DOC_COUNT documents for host $HOSTNAME"