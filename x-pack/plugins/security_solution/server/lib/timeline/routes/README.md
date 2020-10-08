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



