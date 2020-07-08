#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh
# Example: ./get_timeline_by_id.sh {timeline_id}

curl -s -k \
  -H "Content-Type: application/json" \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST "${KIBANA_URL}${SPACE_URL}/api/solutions/security/graphql" \
  -d '{
  "operationName": "GetOneTimeline",
  "variables": {
    "id": "'$1'"
  },
  "query": "query GetOneTimeline($id: ID!) {\n  getOneTimeline(id: $id) {\n    savedObjectId\n    columns {\n      aggregatable\n      category\n      columnHeaderType\n      description\n      example\n      indexes\n      id\n      name\n      searchable\n      type\n      __typename\n    }\n    dataProviders {\n      id\n      name\n      enabled\n      excluded\n      kqlQuery\n      queryMatch {\n        field\n        displayField\n        value\n        displayValue\n        operator\n        __typename\n      }\n      and {\n        id\n        name\n        enabled\n        excluded\n        kqlQuery\n        queryMatch {\n          field\n          displayField\n          value\n          displayValue\n          operator\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    dateRange {\n      start\n      end\n      __typename\n    }\n    description\n    eventType\n    eventIdToNoteIds {\n      eventId\n      note\n      timelineId\n      noteId\n      created\n      createdBy\n      timelineVersion\n      updated\n      updatedBy\n      version\n      __typename\n    }\n    favorite {\n      fullName\n      userName\n      favoriteDate\n      __typename\n    }\n    filters {\n      meta {\n        alias\n        controlledBy\n        disabled\n        field\n        formattedValue\n        index\n        key\n        negate\n        params\n        type\n        value\n        __typename\n      }\n      query\n      exists\n      match_all\n      missing\n      range\n      script\n      __typename\n    }\n    kqlMode\n    kqlQuery {\n      filterQuery {\n        kuery {\n          kind\n          expression\n          __typename\n        }\n        serializedQuery\n        __typename\n      }\n      __typename\n    }\n    notes {\n      eventId\n      note\n      timelineId\n      timelineVersion\n      noteId\n      created\n      createdBy\n      updated\n      updatedBy\n      version\n      __typename\n    }\n    noteIds\n    pinnedEventIds\n    pinnedEventsSaveObject {\n      pinnedEventId\n      eventId\n      timelineId\n      created\n      createdBy\n      updated\n      updatedBy\n      version\n      __typename\n    }\n    status\n    title\n    timelineType\n    templateTimelineId\n    templateTimelineVersion\n    savedQueryId\n    sort {\n      columnId\n      sortDirection\n      __typename\n    }\n    created\n    createdBy\n    updated\n    updatedBy\n    version\n    __typename\n  }\n}\n"
}'
