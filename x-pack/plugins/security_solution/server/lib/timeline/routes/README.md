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