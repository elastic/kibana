#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Uses a default if no argument is specified
NOTIFICATIONS=${2:-./legacy_notifications/one_action.json}

# Posts a legacy notification "side car". This should be removed once there are no more legacy notifications.
# First argument should be a valid alert_id and the second argument should be to a notification file which contains the legacy notification
# Example: ./post_legacy_notification.sh acd008d0-1b19-11ec-b5bd-7733d658a2ea
# Example: ./post_legacy_notification.sh acd008d0-1b19-11ec-b5bd-7733d658a2ea ./legacy_notifications/one_action.json
curl -s -k \
 -H 'Content-Type: application/json' \
 -H 'kbn-xsrf: 123' \
 -H 'elastic-api-version: 1' \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X POST ${KIBANA_URL}${SPACE_URL}/internal/api/detection/legacy/notifications?alert_id="$1" \
  -d @${NOTIFICATIONS} | jq .
