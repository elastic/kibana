#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Add a small partial ECS based mapping of just source.ip, source.port, destination.ip, destination.port
# dnd then adds a large volume of threat lists to it

# Example: .create_threat_mapping.sh

curl -s -k \
  -H "Content-Type: application/json" \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X PUT ${ELASTICSEARCH_URL}/mock-threat-list \
  --data '
{
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "@timestamp": {
        "type": "date"
      },
      "source": {
        "properties": {
          "ip": {
            "type": "ip"
          },
          "port": {
            "type": "long"
          }
        }
      },
      "destination": {
        "properties": {
          "ip": {
            "type": "ip"
          },
          "port": {
            "type": "long"
          }
        }
      },
      "host": {
        "properties": {
          "name": {
            "type": "keyword"
          },
          "ip" : {
            "type" : "ip"
          }
        }
      }
    }
  }
}' | jq .
