#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e

QUERY=${1:-"kibana.rac.alert.status: open"}
STATUS=${2}

echo $IDS
echo "'"$STATUS"'"

cd ./hunter && sh ./post_detections_role.sh && sh ./post_detections_user.sh
cd ../observer && sh ./post_detections_role.sh && sh ./post_detections_user.sh
cd ..

# Example: ./update_observability_alert.sh "kibana.rac.alert.stats: open" <closed | open>
curl -s -k \
 -H 'Content-Type: application/json' \
 -H 'kbn-xsrf: 123' \
 -u observer:changeme \
 -X POST ${KIBANA_URL}${SPACE_URL}/internal/rac/alerts/bulk_update \
-d "{\"query\": \"$QUERY\", \"status\":\"$STATUS\", \"index\":\".alerts-observability.apm.alerts\"}" | jq .
