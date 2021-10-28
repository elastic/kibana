#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e

IDS=${1:-[\"Do4JnHoBqkRSppNZ6vre\"]}
STATUS=${2}

echo $IDS
echo "'"$STATUS"'"

cd ./hunter && sh ./post_detections_role.sh && sh ./post_detections_user.sh
cd ../observer && sh ./post_detections_role.sh && sh ./post_detections_user.sh
cd ..

# Example: ./update_observability_alert.sh [\"my-alert-id\",\"another-alert-id\"] <closed | open>
# curl -s -k \
curl -v \
 -H 'Content-Type: application/json' \
 -H 'kbn-xsrf: 123' \
 -u observer:changeme \
 -X POST ${KIBANA_URL}${SPACE_URL}/internal/rac/alerts/find \
-d "{\"query\": { \"match\": { \"kibana.alert.status\": \"open\" }}, \"index\":\".alerts-observability.apm.alerts\"}" | jq .
