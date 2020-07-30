#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Uses a default if no argument is specified
STATUS=${1:-active}
TIMELINE_TYPE=${2:-default}
TEMPLATE_TIMELINE_TYPE=${3:-custom}

# Example get all timelines:
# ./timelines/find_timeline_by_filter.sh active

# Example get all prepackaged timeline templates:
# ./timelines/find_timeline_by_filter.sh immutable template elastic

# Example get all custom timeline templates:
# ./timelines/find_timeline_by_filter.sh active template custom

curl -s -k \
  -H "Content-Type: application/json" \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST "${KIBANA_URL}${SPACE_URL}/api/solutions/security/graphql" \
  -d '{"operationName":"GetAllTimeline","variables":{"onlyUserFavorite":false,"pageInfo":{"pageIndex":1,"pageSize":10},"search":"","sort":{"sortField":"updated","sortOrder":"desc"},"status":"'$STATUS'","timelineType":"'$TIMELINE_TYPE'","templateTimelineType":"'$TEMPLATE_TIMELINE_TYPE'"},"query":"query GetAllTimeline($pageInfo: PageInfoTimeline!, $search: String, $sort: SortTimeline, $onlyUserFavorite: Boolean, $timelineType: TimelineType, $templateTimelineType: TemplateTimelineType, $status: TimelineStatus) {\n  getAllTimeline(pageInfo: $pageInfo, search: $search, sort: $sort, onlyUserFavorite: $onlyUserFavorite, timelineType: $timelineType, templateTimelineType: $templateTimelineType, status: $status) {\n    totalCount\n    defaultTimelineCount\n    templateTimelineCount\n    elasticTemplateTimelineCount\n    customTemplateTimelineCount\n    favoriteCount\n    timeline {\n      savedObjectId\n      description\n      favorite {\n        fullName\n        userName\n        favoriteDate\n        __typename\n      }\n      eventIdToNoteIds {\n        eventId\n        note\n        timelineId\n        noteId\n        created\n        createdBy\n        timelineVersion\n        updated\n        updatedBy\n        version\n        __typename\n      }\n      notes {\n        eventId\n        note\n        timelineId\n        timelineVersion\n        noteId\n        created\n        createdBy\n        updated\n        updatedBy\n        version\n        __typename\n      }\n      noteIds\n      pinnedEventIds\n      status\n      title\n      timelineType\n      templateTimelineId\n      templateTimelineVersion\n      created\n      createdBy\n      updated\n      updatedBy\n      version\n      __typename\n    }\n    __typename\n  }\n}\n"}' \
  | jq .


