#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Example: ./add_prepackaged_timelines.sh
file=${1:-../rules/prepackaged_timelines/endpoint.ndjson}
url=${KIBANA_URL}${SPACE_URL}/api/timeline/_import

delim="-----MultipartDelimeter$$$RANDOM$RANDOM$RANDOM"
nl=$'\r\n'
mime=application/octet-stream

# Body of the request.
data() {
    # Also make sure to set the fields you need.
    printf %s "--$delim${nl}Content-Disposition: form-data; name=\"file\"; filename=\"endpoint.ndjson\"${nl}Content-Type: $mime$nl$nl"
    cat "$file"
    printf %s "$nl--$delim--$nl"
}

echo response="$(data | curl -X POST "$url" -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} -H 'kbn-xsrf: 123' -H "content-type: multipart/form-data; boundary=$delim" --data-binary @-)"
