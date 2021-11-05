**Timeline apis**

 1. Create timeline api
 2. Update timeline api
 3. Create template timeline api
 4. Update template timeline api


## Create timeline api
#### POST /api/timeline
##### Authorization
Type: Basic Auth
username: Your Kibana username
password: Your Kibana password


##### Request header
```
Content-Type: application/json
kbn-version: 8.0.0
```
##### Request body
```json
{
	"timeline": {
	     "columns": [
		    {
	          "columnHeaderType": "not-filtered",
	          "id": "@timestamp"
	        },
	        {
	          "columnHeaderType": "not-filtered",
	          "id": "message"
	        },
	        {
	          "columnHeaderType": "not-filtered",
	          "id": "event.category"
	        },
	        {
	          "columnHeaderType": "not-filtered",
	          "id": "event.action"
	        },
	        {
	          "columnHeaderType": "not-filtered",
	          "id": "host.name"
	        },
	        {
	          "columnHeaderType": "not-filtered",
	          "id": "source.ip"
	        },
	        {
	          "columnHeaderType": "not-filtered",
	          "id": "destination.ip"
	        },
	        {
	          "columnHeaderType": "not-filtered",
	          "id": "user.name"
	        }
		  ],
	     "dataProviders": [],
	     "description": "",
	     "eventType": "all",
	     "filters": [],
	     "kqlMode": "filter",
	     "kqlQuery": {
	       "filterQuery": null
	     },
	     "title": "abd",
	     "dateRange": {
	       "start": 1587370079200,
	       "end": 1587456479201
	     },
	     "savedQueryId": null,
	     "sort": {
	       "columnId": "@timestamp",
	       "sortDirection": "desc"
	     }
	 },
	"timelineId":null, // Leave this as null
	"version":null // Leave this as null
}
```


## Update timeline api
#### PATCH /api/timeline
##### Authorization
Type: Basic Auth
username: Your Kibana username
password: Your Kibana password


##### Request header
```
Content-Type: application/json
kbn-version: 8.0.0
```
##### Request body
```json
{
	"timeline": {
        "columns": [
            {
                "columnHeaderType": "not-filtered",
                "id": "@timestamp"
            },
            {
                "columnHeaderType": "not-filtered",
                "id": "message"
            },
            {
                "columnHeaderType": "not-filtered",
                "id": "event.category"
            },
            {
                "columnHeaderType": "not-filtered",
                "id": "event.action"
            },
            {
                "columnHeaderType": "not-filtered",
                "id": "host.name"
            },
            {
                "columnHeaderType": "not-filtered",
                "id": "source.ip"
            },
            {
                "columnHeaderType": "not-filtered",
                "id": "destination.ip"
            },
            {
                "columnHeaderType": "not-filtered",
                "id": "user.name"
            }
        ],
        "dataProviders": [],
        "description": "",
        "eventType": "all",
        "filters": [],
        "kqlMode": "filter",
        "kqlQuery": {
            "filterQuery": null
        },
        "title": "abd",
        "dateRange": {
            "start": 1587370079200,
            "end": 1587456479201
        },
        "savedQueryId": null,
        "sort": {
            "columnId": "@timestamp",
            "sortDirection": "desc"
        },
        "created": 1587468588922,
        "createdBy": "casetester",
        "updated": 1587468588922,
        "updatedBy": "casetester",
        "timelineType": "default"
    },
	"timelineId":"68ea5330-83c3-11ea-bff9-ab01dd7cb6cc", // Have to match the existing timeline savedObject id
	"version":"WzYwLDFd" // Have to match the existing timeline version
}
```

## Create template timeline api
#### POST /api/timeline
##### Authorization
Type: Basic Auth
username: Your Kibana username
password: Your Kibana password


##### Request header
```
Content-Type: application/json
kbn-version: 8.0.0
```
##### Request body
```json
{
	"timeline": {
      "columns": [
        {
          "columnHeaderType": "not-filtered",
          "id": "@timestamp"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "message"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "event.category"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "event.action"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "host.name"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "source.ip"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "destination.ip"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "user.name"
        }
      ],
      "dataProviders": [

      ],
      "description": "",
      "eventType": "all",
      "filters": [

      ],
      "kqlMode": "filter",
      "kqlQuery": {
        "filterQuery": null
      },
      "title": "abd",
      "dateRange": {
        "start": 1587370079200,
        "end": 1587456479201
      },
      "savedQueryId": null,
      "sort": {
        "columnId": "@timestamp",
        "sortDirection": "desc"
      },
      "timelineType": "template" // This is the difference between create timeline
    },
	"timelineId":null, // Leave this as null
	"version":null // Leave this as null
}
```


## Update template timeline api
#### PATCH /api/timeline
##### Authorization
Type: Basic Auth
username: Your Kibana username
password: Your Kibana password


##### Request header
```
Content-Type: application/json
kbn-version: 8.0.0
```
##### Request body
```json
{
	"timeline": {
         "columns": [
             {
                 "columnHeaderType": "not-filtered",
                 "id": "@timestamp"
             },
             {
                 "columnHeaderType": "not-filtered",
                 "id": "message"
             },
             {
                 "columnHeaderType": "not-filtered",
                 "id": "event.category"
             },
             {
                 "columnHeaderType": "not-filtered",
                 "id": "event.action"
             },
             {
                 "columnHeaderType": "not-filtered",
                 "id": "host.name"
             },
             {
                 "columnHeaderType": "not-filtered",
                 "id": "source.ip"
             },
             {
                 "columnHeaderType": "not-filtered",
                 "id": "destination.ip"
             },
             {
                 "columnHeaderType": "not-filtered",
                 "id": "user.name"
             }
         ],
         "dataProviders": [],
         "description": "",
         "eventType": "all",
         "filters": [],
         "kqlMode": "filter",
         "kqlQuery": {
             "filterQuery": null
         },
         "title": "abd",
         "dateRange": {
             "start": 1587370079200,
             "end": 1587456479201
         },
         "savedQueryId": null,
         "sort": {
             "columnId": "@timestamp",
             "sortDirection": "desc"
         },
         "timelineType": "template",
         "created": 1587473119992,
         "createdBy": "casetester",
         "updated": 1587473119992,
         "updatedBy": "casetester",
         "templateTimelineId": "745d0316-6af7-43bf-afd6-9747119754fb", // Please provide the existing template timeline version
         "templateTimelineVersion": 2 // Please provide a template timeline version grater than existing one
     },
     "timelineId":"f5a4bd10-83cd-11ea-bf78-0547a65f1281", // This is a must as well
     "version":"Wzg2LDFd" // Please provide the existing timeline version
}
```

## Export timeline api

#### POST /api/timeline/_export

##### Authorization

Type: Basic Auth

username: Your Kibana username

password: Your Kibana password




##### Request header

```

Content-Type: application/json

kbn-version: 8.0.0

```

##### Request param

```
file_name:	${filename}.ndjson
```

##### Request body
```json
{
	ids: [
		${timelineId}
	]
}
```

## Import timeline api

#### POST /api/timeline/_import

##### Authorization

Type: Basic Auth

username: Your Kibana username

password: Your Kibana password




##### Request header

```

Content-Type: application/json

kbn-version: 8.0.0

```

##### Request body

```
{
  file: sample.ndjson
}
```


(each json in the file should match this format)
example:
```
{"savedObjectId":"a3002fd0-781b-11ea-85e4-df9002f1452c","version":"WzIzLDFd","columns":[{"columnHeaderType":"not-filtered","id":"@timestamp"},{"columnHeaderType":"not-filtered","id":"message"},{"columnHeaderType":"not-filtered","id":"event.category"},{"columnHeaderType":"not-filtered","id":"event.action"},{"columnHeaderType":"not-filtered","id":"host.name"},{"columnHeaderType":"not-filtered","id":"source.ip"},{"columnHeaderType":"not-filtered","id":"destination.ip"},{"columnHeaderType":"not-filtered","id":"user.name"}],"dataProviders":[],"description":"tes description","eventType":"all","filters":[{"meta":{"field":null,"negate":false,"alias":null,"disabled":false,"params":"{\"query\":\"MacBook-Pro-de-Gloria.local\"}","type":"phrase","key":"host.name"},"query":"{\"match_phrase\":{\"host.name\":\"MacBook-Pro-de-Gloria.local\"}}","missing":null,"exists":null,"match_all":null,"range":null,"script":null}],"kqlMode":"filter","kqlQuery":{"filterQuery":{"serializedQuery":"{\"bool\":{\"should\":[{\"exists\":{\"field\":\"host.name\"}}],\"minimum_should_match\":1}}","kuery":{"expression":"host.name: *","kind":"kuery"}}},"title":"Test","dateRange":{"start":1585227005527,"end":1585313405527},"savedQueryId":null,"sort":{"columnId":"@timestamp","sortDirection":"desc"},"created":1586187068132,"createdBy":"angela","updated":1586187068132,"updatedBy":"angela","eventNotes":[],"globalNotes":[{"noteId":"a3b4d9d0-781b-11ea-85e4-df9002f1452c","version":"WzI1LDFd","note":"this is a note","timelineId":"a3002fd0-781b-11ea-85e4-df9002f1452c","created":1586187069313,"createdBy":"angela","updated":1586187069313,"updatedBy":"angela"}],"pinnedEventIds":[]}
```

##### Response
```
{"success":true,"success_count":1,"errors":[]}
```

## Get draft timeline api

#### GET /api/timeline/_draft

##### Authorization

Type: Basic Auth

username: Your Kibana username

password: Your Kibana password


##### Request header

```

Content-Type: application/json

kbn-version: 8.0.0

```

##### Request param
```
timelineType: `default` or `template`
```

##### Response
```json
{
    "data": {
        "persistTimeline": {
            "timeline": {
                "savedObjectId": "ababbd90-99de-11ea-8446-1d7fd9f03ebf",
                "version": "WzM2MiwzXQ==",
                "columns": [
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "@timestamp"
                    },
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "message"
                    },
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "event.category"
                    },
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "event.action"
                    },
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "host.name"
                    },
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "source.ip"
                    },
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "destination.ip"
                    },
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "user.name"
                    }
                ],
                "dataProviders": [],
                "description": "",
                "eventType": "all",
                "filters": [],
                "kqlMode": "filter",
                "timelineType": "default",
                "kqlQuery": {
                    "filterQuery": null
                },
                "title": "",
                "sort": {
                    "columnId": "@timestamp",
                    "sortDirection": "desc"
                },
                "status": "draft",
                "created": 1589899222908,
                "createdBy": "casetester",
                "updated": 1589899222908,
                "updatedBy": "casetester",
                "templateTimelineId": null,
                "templateTimelineVersion": null,
                "favorite": [],
                "eventIdToNoteIds": [],
                "noteIds": [],
                "notes": [],
                "pinnedEventIds": [],
                "pinnedEventsSaveObject": []
            }
        }
    }
}
```

## Create draft timeline api

#### POST /api/timeline/_draft

##### Authorization

Type: Basic Auth

username: Your Kibana username

password: Your Kibana password


##### Request header

```

Content-Type: application/json

kbn-version: 8.0.0

```

##### Request body

```json
{
	"timelineType": "default" or "template"
}
```

##### Response
```json
{
    "data": {
        "persistTimeline": {
            "timeline": {
                "savedObjectId": "ababbd90-99de-11ea-8446-1d7fd9f03ebf",
                "version": "WzQyMywzXQ==",
                "columns": [
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "@timestamp"
                    },
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "message"
                    },
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "event.category"
                    },
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "event.action"
                    },
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "host.name"
                    },
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "source.ip"
                    },
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "destination.ip"
                    },
                    {
                        "columnHeaderType": "not-filtered",
                        "id": "user.name"
                    }
                ],
                "dataProviders": [],
                "description": "",
                "eventType": "all",
                "filters": [],
                "kqlMode": "filter",
                "timelineType": "default",
                "kqlQuery": {
                    "filterQuery": null
                },
                "title": "",
                "sort": {
                    "columnId": "@timestamp",
                    "sortDirection": "desc"
                },
                "status": "draft",
                "created": 1589903306582,
                "createdBy": "casetester",
                "updated": 1589903306582,
                "updatedBy": "casetester",
                "templateTimelineId": null,
                "templateTimelineVersion": null,
                "favorite": [],
                "eventIdToNoteIds": [],
                "noteIds": [],
                "notes": [],
                "pinnedEventIds": [],
                "pinnedEventsSaveObject": []
            }
        }
    }
}
```

## Get timelines / timeline templates api

#### GET /api/timelines


##### Authorization

Type: Basic Auth
username: Your Kibana username
password: Your Kibana password


##### Request header

```
Content-Type: application/json
kbn-version: 8.0.0
```

##### Query params

optional:
only_user_favorite={boolean}
page_index={number}
page_size={number}
search={string}
sort_field={title|description|updated|created}
sort_order={asc|desc}
status={active|draft|immutable}
timeline_type={default|template}

##### example
api/timelines?page_size=10&page_index=1&sort_field=updated&sort_order=desc&timeline_type=default

##### Response

```json
{
  "totalCount": 2,
  "timeline": [
    {
      "savedObjectId": "de9a3620-8e23-11eb-ad8a-a192243e45e8",
      "version": "WzM1NzQ4NywzXQ==",
      "columns": [
        {
          "columnHeaderType": "not-filtered",
          "id": "@timestamp",
          "type": "number"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "message"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "event.category"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "event.action"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "host.name"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "source.ip"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "destination.ip"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "user.name"
        }
      ],
      "dataProviders": [
        {
          "excluded": false,
          "and": [],
          "kqlQuery": "",
          "name": "",
          "queryMatch": {
            "field": "host.name",
            "value": "",
            "operator": ":*"
          },
          "id": "timeline-1-db9f4fc8-9420-420e-8e67-b12dd36691f6",
          "type": "default",
          "enabled": true
        }
      ],
      "dataViewId": "security-solution",
      "description": "",
      "eqlOptions": {
        "tiebreakerField": "",
        "size": 100,
        "query": "",
        "eventCategoryField": "event.category",
        "timestampField": "@timestamp"
      },
      "eventType": "all",
      "excludedRowRendererIds": [],
      "filters": [],
      "kqlMode": "filter",
      "kqlQuery": {
        "filterQuery": null
      },
      "indexNames": [
        ".siem-signals-angelachuang-default",
        "auditbeat-*",
        "endgame-*",
        "filebeat-*",
        "logs-*",
        "packetbeat-*",
        "winlogbeat-*"
      ],
      "title": "timeline - Duplicate",
      "timelineType": "default",
      "templateTimelineVersion": null,
      "templateTimelineId": null,
      "dateRange": {
        "start": "2021-03-25T05:38:55.593Z",
        "end": "2021-03-26T15:59:59.999Z"
      },
      "savedQueryId": null,
      "sort": [
        {
          "columnType": "number",
          "sortDirection": "desc",
          "columnId": "@timestamp"
        }
      ],
      "status": "active",
      "created": 1616757027458,
      "createdBy": "angela",
      "updated": 1616758738320,
      "updatedBy": "angela",
      "favorite": [],
      "eventIdToNoteIds": [
        {
          "noteId": "e6f3a9a0-8e23-11eb-ad8a-a192243e45e8",
          "version": "WzM1NzQ4MywzXQ==",
          "eventId": "QN84bngBYJMSg9tnAi1V",
          "note": "note!",
          "timelineId": "de9a3620-8e23-11eb-ad8a-a192243e45e8",
          "created": 1616757041466,
          "createdBy": "angela",
          "updated": 1616757041466,
          "updatedBy": "angela"
        }
      ],
      "noteIds": [
        "221524f0-8e24-11eb-ad8a-a192243e45e8"
      ],
      "notes": [
        {
          "noteId": "e6f3a9a0-8e23-11eb-ad8a-a192243e45e8",
          "version": "WzM1NzQ4MywzXQ==",
          "eventId": "QN84bngBYJMSg9tnAi1V",
          "note": "note!",
          "timelineId": "de9a3620-8e23-11eb-ad8a-a192243e45e8",
          "created": 1616757041466,
          "createdBy": "angela",
          "updated": 1616757041466,
          "updatedBy": "angela"
        },
        {
          "noteId": "221524f0-8e24-11eb-ad8a-a192243e45e8",
          "version": "WzM1NzQ4NiwzXQ==",
          "note": "global note!",
          "timelineId": "de9a3620-8e23-11eb-ad8a-a192243e45e8",
          "created": 1616757140671,
          "createdBy": "angela",
          "updated": 1616757140671,
          "updatedBy": "angela"
        }
      ],
      "pinnedEventIds": [
        "QN84bngBYJMSg9tnAi1V",
        "P984bngBYJMSg9tnAi1V"
      ],
      "pinnedEventsSaveObject": [
        {
          "pinnedEventId": "e85339a0-8e23-11eb-ad8a-a192243e45e8",
          "version": "WzM1NzQ4NCwzXQ==",
          "eventId": "QN84bngBYJMSg9tnAi1V",
          "timelineId": "de9a3620-8e23-11eb-ad8a-a192243e45e8",
          "created": 1616757043770,
          "createdBy": "angela",
          "updated": 1616757043770,
          "updatedBy": "angela"
        },
        {
          "pinnedEventId": "2945cfe0-8e24-11eb-ad8a-a192243e45e8",
          "version": "WzM1NzQ4NSwzXQ==",
          "eventId": "P984bngBYJMSg9tnAi1V",
          "timelineId": "de9a3620-8e23-11eb-ad8a-a192243e45e8",
          "created": 1616757152734,
          "createdBy": "angela",
          "updated": 1616757152734,
          "updatedBy": "angela"
        }
      ]
    },
    {
      "savedObjectId": "48870270-8e1f-11eb-9cbd-7f6324a02fb7",
      "version": "WzM1NzQ4MiwzXQ==",
      "columns": [
        {
          "columnHeaderType": "not-filtered",
          "id": "@timestamp",
          "type": "number"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "message"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "event.category"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "event.action"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "host.name"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "source.ip"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "destination.ip"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "user.name"
        }
      ],
      "dataProviders": [
        {
          "excluded": false,
          "and": [],
          "kqlQuery": "",
          "name": "",
          "queryMatch": {
            "field": "host.name",
            "value": "",
            "operator": ":*"
          },
          "id": "timeline-1-db9f4fc8-9420-420e-8e67-b12dd36691f6",
          "type": "default",
          "enabled": true
        }
      ],
      "dataViewId": "security-solution",
      "description": "",
      "eventType": "all",
      "filters": [],
      "kqlMode": "filter",
      "timelineType": "default",
      "kqlQuery": {
        "filterQuery": null
      },
      "title": "timeline",
      "sort": [
        {
          "columnType": "number",
          "sortDirection": "desc",
          "columnId": "@timestamp"
        }
      ],
      "status": "active",
      "created": 1616755057686,
      "createdBy": "angela",
      "updated": 1616756755376,
      "updatedBy": "angela",
      "templateTimelineId": null,
      "templateTimelineVersion": null,
      "excludedRowRendererIds": [],
      "dateRange": {
        "start": "2021-03-25T16:00:00.000Z",
        "end": "2021-03-26T15:59:59.999Z"
      },
      "indexNames": [
        "auditbeat-*",
        "endgame-*",
        "filebeat-*",
        "logs-*",
        "packetbeat-*",
        "winlogbeat-*",
        ".siem-signals-angelachuang-default"
      ],
      "eqlOptions": {
        "tiebreakerField": "",
        "size": 100,
        "query": "",
        "eventCategoryField": "event.category",
        "timestampField": "@timestamp"
      },
      "savedQueryId": null,
      "favorite": [
        {
          "favoriteDate": 1616756755376,
          "keySearch": "YW5nZWxh",
          "fullName": "Angela",
          "userName": "angela"
        }
      ],
      "eventIdToNoteIds": [],
      "noteIds": [],
      "notes": [],
      "pinnedEventIds": [],
      "pinnedEventsSaveObject": []
    }
  ],
  "defaultTimelineCount": 2,
  "templateTimelineCount": 4,
  "elasticTemplateTimelineCount": 3,
  "customTemplateTimelineCount": 1,
  "favoriteCount": 1
}
```

## Get timeline api

#### GET /api/id?id={savedObjectId}

##### Authorization

Type: Basic Auth
username: Your Kibana username
password: Your Kibana password


##### Request header

```
Content-Type: application/json
kbn-version: 8.0.0
```

##### Response
```json
{
  "data": {
    "getOneTimeline": {
      "savedObjectId": "48870270-8e1f-11eb-9cbd-7f6324a02fb7",
      "version": "WzM1NzQ4MiwzXQ==",
      "columns": [
        {
          "columnHeaderType": "not-filtered",
          "id": "@timestamp",
          "type": "number"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "message"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "event.category"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "event.action"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "host.name"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "source.ip"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "destination.ip"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "user.name"
        }
      ],
      "dataProviders": [
        {
          "excluded": false,
          "and": [],
          "kqlQuery": "",
          "name": "",
          "queryMatch": {
            "field": "host.name",
            "value": "",
            "operator": ":*"
          },
          "id": "timeline-1-db9f4fc8-9420-420e-8e67-b12dd36691f6",
          "type": "default",
          "enabled": true
        }
      ],
      "dataViewId": "security-solution",
      "description": "",
      "eventType": "all",
      "filters": [],
      "kqlMode": "filter",
      "timelineType": "default",
      "kqlQuery": {
        "filterQuery": null
      },
      "title": "timeline",
      "sort": [
        {
          "columnType": "number",
          "sortDirection": "desc",
          "columnId": "@timestamp"
        }
      ],
      "status": "active",
      "created": 1616755057686,
      "createdBy": "angela",
      "updated": 1616756755376,
      "updatedBy": "angela",
      "templateTimelineId": null,
      "templateTimelineVersion": null,
      "excludedRowRendererIds": [],
      "dateRange": {
        "start": "2021-03-25T16:00:00.000Z",
        "end": "2021-03-26T15:59:59.999Z"
      },
      "indexNames": [
        "auditbeat-*",
        "endgame-*",
        "filebeat-*",
        "logs-*",
        "packetbeat-*",
        "winlogbeat-*",
        ".siem-signals-angelachuang-default"
      ],
      "eqlOptions": {
        "tiebreakerField": "",
        "size": 100,
        "query": "",
        "eventCategoryField": "event.category",
        "timestampField": "@timestamp"
      },
      "savedQueryId": null,
      "favorite": [
        {
          "favoriteDate": 1616756755376,
          "keySearch": "YW5nZWxh",
          "fullName": "Angela",
          "userName": "angela"
        }
      ],
      "eventIdToNoteIds": [],
      "noteIds": [],
      "notes": [],
      "pinnedEventIds": [],
      "pinnedEventsSaveObject": []
    }
  }
}
```


## Get timeline template api

#### GET /api/timeline?template_timeline_id={templateTimelineId}

##### Authorization

Type: Basic Auth
username: Your Kibana username
password: Your Kibana password


##### Request header

```
Content-Type: application/json
kbn-version: 8.0.0
```

##### Response
```json
{
  "data": {
    "getOneTimeline": {
      "savedObjectId": "bf662160-9788-11eb-8277-3516cc4109c3",
      "version": "WzM1NzU2MCwzXQ==",
      "columns": [
        {
          "columnHeaderType": "not-filtered",
          "id": "@timestamp"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "signal.rule.description"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "event.action"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "process.name"
        },
        {
          "aggregatable": true,
          "description": "The working directory of the process.",
          "columnHeaderType": "not-filtered",
          "id": "process.working_directory",
          "category": "process",
          "type": "string",
          "example": "/home/alice"
        },
        {
          "aggregatable": true,
          "description": "Array of process arguments, starting with the absolute path to\nthe executable.\n\nMay be filtered to protect sensitive information.",
          "columnHeaderType": "not-filtered",
          "id": "process.args",
          "category": "process",
          "type": "string",
          "example": "[\"/usr/bin/ssh\",\"-l\",\"user\",\"10.0.0.16\"]"
        },
        {
          "columnHeaderType": "not-filtered",
          "id": "process.pid"
        },
        {
          "aggregatable": true,
          "description": "Absolute path to the process executable.",
          "columnHeaderType": "not-filtered",
          "id": "process.parent.executable",
          "category": "process",
          "type": "string",
          "example": "/usr/bin/ssh"
        },
        {
          "aggregatable": true,
          "description": "Array of process arguments.\n\nMay be filtered to protect sensitive information.",
          "columnHeaderType": "not-filtered",
          "id": "process.parent.args",
          "category": "process",
          "type": "string",
          "example": "[\"ssh\",\"-l\",\"user\",\"10.0.0.16\"]"
        },
        {
          "aggregatable": true,
          "description": "Process id.",
          "columnHeaderType": "not-filtered",
          "id": "process.parent.pid",
          "category": "process",
          "type": "number",
          "example": "4242"
        },
        {
          "aggregatable": true,
          "description": "Short name or login of the user.",
          "columnHeaderType": "not-filtered",
          "id": "user.name",
          "category": "user",
          "type": "string",
          "example": "albert"
        },
        {
          "aggregatable": true,
          "description": "Name of the host.\n\nIt can contain what `hostname` returns on Unix systems, the fully qualified\ndomain name, or a name specified by the user. The sender decides which value\nto use.",
          "columnHeaderType": "not-filtered",
          "id": "host.name",
          "category": "host",
          "type": "string"
        }
      ],
      "dataProviders": [
        {
          "excluded": false,
          "and": [],
          "kqlQuery": "",
          "name": "{process.name}",
          "queryMatch": {
            "displayValue": null,
            "field": "process.name",
            "displayField": null,
            "value": "{process.name}",
            "operator": ":"
          },
          "id": "timeline-1-8622010a-61fb-490d-b162-beac9c36a853",
          "type": "template",
          "enabled": true
        }
      ],
      "dataViewId": "security-solution",
      "description": "",
      "eqlOptions": {
        "eventCategoryField": "event.category",
        "tiebreakerField": "",
        "timestampField": "@timestamp",
        "query": "",
        "size": 100
      },
      "eventType": "all",
      "excludedRowRendererIds": [],
      "filters": [],
      "kqlMode": "filter",
      "kqlQuery": {
        "filterQuery": {
          "kuery": {
            "kind": "kuery",
            "expression": ""
          },
          "serializedQuery": ""
        }
      },
      "indexNames": [],
      "title": "Generic Process Timeline - Duplicate",
      "timelineType": "template",
      "templateTimelineVersion": 1,
      "templateTimelineId": "94dd7443-97ea-4461-864d-fa96803ec111",
      "dateRange": {
        "start": "2021-04-06T07:57:57.922Z",
        "end": "2021-04-07T07:57:57.922Z"
      },
      "savedQueryId": null,
      "sort": [
        {
          "sortDirection": "desc",
          "columnId": "@timestamp"
        }
      ],
      "status": "active",
      "created": 1617789914742,
      "createdBy": "angela",
      "updated": 1617790158569,
      "updatedBy": "angela",
      "favorite": [
        {
          "favoriteDate": 1617790158569,
          "keySearch": "YW5nZWxh",
          "fullName": "Angela",
          "userName": "angela"
        }
      ],
      "eventIdToNoteIds": [],
      "noteIds": [],
      "notes": [],
      "pinnedEventIds": [],
      "pinnedEventsSaveObject": []
    }
  }
}
```

## Delete timeline api

#### DELETE /api/timeline

##### Authorization

Type: Basic Auth
username: Your Kibana username
password: Your Kibana password


##### Request header

```

Content-Type: application/json

kbn-version: 8.0.0

```

##### Request body

```json
{
	"savedObjectIds": [savedObjectId1, savedObjectId2]
}
```

##### Response
```json
{"data":{"deleteTimeline":true}}
```

## Persist note api

#### POST /api/note

##### Authorization

Type: Basic Auth
username: Your Kibana username
password: Your Kibana password


##### Request header

```
Content-Type: application/json
kbn-version: 8.0.0
```

##### Request body

```json
{
	"note": {
		"timelineId": {timeline id that the note is linked to},
		"eventId" (optional): {event id the note is linked to. Not available is it is a global note},
		"note"(optional):  {note content},
	},
	"noteId"(optional): note savedObjectId,
	"version" (optional): note savedObjectVersion
}
```
##### Example
```json
{
  "noteId": null,
  "version": null,
  "note": {
    "eventId": "Q9tqqXgBc4D54_cxJnHV",
    "note": "note",
    "timelineId": "1ec3b430-908e-11eb-94fa-c9122cbc0213"
  }
}
```

##### Response
```
{
  "data": {
    "persistNote": {
      "code": 200,
      "message": "success",
      "note": {
        "noteId": "fe8f6980-97ad-11eb-862e-850f4426d3d0",
        "version": "WzM1MDAyNSwzXQ==",
        "eventId": "UNtqqXgBc4D54_cxIGi-",
        "note": "event note",
        "timelineId": "1ec3b430-908e-11eb-94fa-c9122cbc0213",
        "created": 1617805912088,
        "createdBy": "angela",
        "updated": 1617805912088,
        "updatedBy": "angela"
      }
    }
  }
}
```

## Persist pinned event api

#### POST /api/pinned_event

##### Authorization

Type: Basic Auth
username: Your Kibana username
password: Your Kibana password


##### Request header

```
Content-Type: application/json
kbn-version: 8.0.0
```

##### Request body

```json
{
	"eventId":  {event which is pinned}
	"pinnedEventId" (optional):  {pinned event savedObjectId}
	"timelineId":  {timeline which this pinned event is linked to}
}
```

##### example

```
{
	"eventId":"UdtqqXgBc4D54_cxIGi",
	"pinnedEventId":null,
	"timelineId":"1ec3b430-908e-11eb-94fa-c9122cbc0213"
}
```

##### Response
```json
{
  "data": {
    "persistPinnedEventOnTimeline": {
      "pinnedEventId": "5b8f1720-97ae-11eb-862e-850f4426d3d0",
      "version": "WzM1MDA1OSwzXQ==",
      "eventId": "UdtqqXgBc4D54_cxIGi-",
      "timelineId": "1ec3b430-908e-11eb-94fa-c9122cbc0213",
      "created": 1617806068114,
      "createdBy": "angela",
      "updated": 1617806068114,
      "updatedBy": "angela"
    }
  }
}
```



