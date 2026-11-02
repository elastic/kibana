# Auth0 Log Streams Integration

Auth0 offers integrations that push log events via log streams to Elasticsearch or allows an Elastic Agent to make API requests for log events. The [Auth0 Log Streams](https://auth0.com/docs/customize/log-streams) integration package creates a HTTP listener that accepts incoming log events or runs periodic API requests to collect events and ingests them into Elasticsearch. This allows you to search, observe and visualize the Auth0 log events through Elasticsearch.

## Compatibility

The package collects log events either sent via log stream webhooks, or by API request to the Auth0 v2 API.

## Enabling the integration in Elastic

1. In Kibana go to **Management > Integrations**
2. In "Search for integrations" search bar type **Auth0**
3. Click on "Auth0" integration from the search results.
4. Click on **Add Auth0** button to add Auth0 integration.

## Configuration for Webhook input

The agent running this integration must be able to accept requests from the Internet in order for Auth0 to be able connect. Auth0 requires that the webhook accept requests over HTTPS. So you must either configure the integration with a valid TLS certificate or use a reverse proxy in front of the integration.

This integration method is also documented on the Auth0 webpage for the [Elastic Security integration](https://marketplace.auth0.com/integrations/elastic-security).

### Configure the Auth0 integration

1. Click on **Collect Auth0 log streams events via Webhooks** to enable it.
2. Enter values for **Listen Address**, **Listen Port** and **Webhook Path**.
3. Enter value for **Authorization Token**. This must match the value entered when configuring the "Custom Webhook" in Auth0 cloud.
4. In the "Advanced options" section, enter settings for **SSL Configuration**. Auth0 requires that webhook requests use HTTPS. So you must either configure the integration with a valid TLS certificate here, or use a separarately configured reverse proxy in front of the agent.

Using the external address of the agent to which the integration is added, and the configured "Listen Port" and "Webhook Path", make a note of the full endpoint URL. It will have the form `https://{AGENT_ADDRESS}:{LISTEN_PORT}{WEBHOOK_PATH}` (for example, `https://agent01.external.example.com:8383/auth0/logs`).

### Creating the stream in Auth0

1. From the Auth0 management console, navigate to **Logs > Streams** and click **+ Create Stream**.
2. Choose **Custom Webhook**.
3. Name the new **Event Stream** appropriately (e.g. Elastic) and click **Create**.
4. In **Payload URL**, enter the endpoint URL set up in the **Configure the Auth0 integration** section.
5. In **Authorization Token**, enter the **Authorization Token**. This must match the value entered in Step 3 of the **Configure the Auth0 integration** section.
6. In **Content Type**, choose  **application/json**.
7. In **Content Format**, choose **JSON Lines**.
8. Click **Save**.

## Configuration for API request input

### Creating an application in Auth0

1. From the Auth0 management console, navigate to **Applications > Applications** and click **+ Create Application**.
2. Choose **Machine to Machine Application**.
3. Name the new **Application** appropriately (e.g. Elastic) and click **Create**.
4. Select the **Auth0 Management API** option and click **Authorize**.
5. Select the `read:logs` and `read:logs_users` permissions and then click **Authorize**.
6. Navigate to the **Settings** tab. Take note of the "Domain", "Client ID" and "Client Secret" values in the **Basic Information** section.
7. Click **Save Changes**.

### Configure the Auth0 integration

1. In the Elastic Auth0 integration user interface click on **Collect Auth0 log events via API requests** to enable it.
2. Enter value for "URL". This must be an https URL using the **Domain** value obtained from Auth cloud above.
3. Enter value for "Client ID". This must match the "Client ID" value obtained from Auth0 cloud above.
4. Enter value for "Client Secret". This must match the "Client Secret" value obtained from Auth0 cloud above.

## Log Events

Enable to collect Auth0 log events for all the applications configured for the chosen log stream.

## Logs

### Log Stream Events

The Auth0 logs dataset provides events from Auth0 log stream. All Auth0 log events are available in the `auth0.logs` field group.

**Exported fields**

| Field | Description | Type |
|---|---|---|
| @timestamp | Event timestamp. | date |
| auth0.logs.data.audience | API audience the event applies to. | keyword |
| auth0.logs.data.classification | Log stream filters | keyword |
| auth0.logs.data.client_id | ID of the client (application). | keyword |
| auth0.logs.data.client_name | Name of the client (application). | keyword |
| auth0.logs.data.connection | Name of the connection the event relates to. | keyword |
| auth0.logs.data.connection_id | ID of the connection the event relates to. | keyword |
| auth0.logs.data.date | Date when the event occurred in ISO 8601 format. | date |
| auth0.logs.data.description | Description of this event. | text |
| auth0.logs.data.details | Additional useful details about this event (values here depend upon event type). | flattened |
| auth0.logs.data.hostname | Hostname the event applies to. | keyword |
| auth0.logs.data.ip | IP address of the log event source. | ip |
| auth0.logs.data.is_mobile | Whether the client was a mobile device (true) or desktop/laptop/server (false). | boolean |
| auth0.logs.data.location_info.city_name | Full city name in English. | keyword |
| auth0.logs.data.location_info.continent_code | Continent the country is located within. Can be AF (Africa), AN (Antarctica), AS (Asia), EU (Europe), NA (North America), OC (Oceania) or SA (South America). | keyword |
| auth0.logs.data.location_info.country_code | Two-letter [Alpha-2 ISO 3166-1](https://www.iso.org/iso-3166-country-codes.html) country code | keyword |
| auth0.logs.data.location_info.country_code3 | Three-letter [Alpha-3 ISO 3166-1](https://www.iso.org/iso-3166-country-codes.html) country code | keyword |
| auth0.logs.data.location_info.country_name | Full country name in English. | keyword |
| auth0.logs.data.location_info.latitude | Global latitude (horizontal) position. | keyword |
| auth0.logs.data.location_info.longitude | Global longitude (vertical) position. | keyword |
| auth0.logs.data.location_info.time_zone | Time zone name as found in the [tz database](https://www.iana.org/time-zones). | keyword |
| auth0.logs.data.log_id | Unique log event identifier | keyword |
| auth0.logs.data.login.completedAt | Time at which the operation was completed | date |
| auth0.logs.data.login.elapsedTime | The total amount of time in milliseconds the operation took to complete. | long |
| auth0.logs.data.login.initiatedAt | Time at which the operation was initiated | date |
| auth0.logs.data.login.stats.loginsCount | Total number of logins performed by the user | long |
| auth0.logs.data.scope | Scope permissions applied to the event. | keyword |
| auth0.logs.data.strategy | Name of the strategy involved in the event. | keyword |
| auth0.logs.data.strategy_type | Type of strategy involved in the event. | keyword |
| auth0.logs.data.tenant_name | The name of the auth0 tenant. | keyword |
| auth0.logs.data.type | Type of event. | keyword |
| auth0.logs.data.type_id | The short Auth0 type identifier. | keyword |
| auth0.logs.data.user_agent | User agent string from the client device that caused the event. | text |
| auth0.logs.data.user_id | ID of the user involved in the event. | keyword |
| auth0.logs.data.user_name | Name of the user involved in the event. | keyword |
| auth0.logs.log_id | Unique log event identifier | keyword |
| data_stream.dataset | Data stream dataset. | constant_keyword |
| data_stream.namespace | Data stream namespace. | constant_keyword |
| data_stream.type | Data stream type. | constant_keyword |
| event.dataset | Event timestamp. | constant_keyword |
| event.module | Event timestamp. | constant_keyword |
| input.type | Input type. | keyword |


An example event for `logs` looks as following:

```json
{
    "@timestamp": "2021-11-03T03:06:05.696Z",
    "agent": {
        "ephemeral_id": "c332091a-27ef-4163-97f1-602c0c5722d2",
        "id": "0f4499f8-3f89-4f53-945d-1f033cc2bf93",
        "name": "elastic-agent-42968",
        "type": "filebeat",
        "version": "8.18.1"
    },
    "auth0": {
        "logs": {
            "data": {
                "classification": "Login - Failure",
                "date": "2021-11-03T03:06:05.696Z",
                "description": "Callback URL mismatch. http://localhost:3000/callback is not in the list of allowed callback URLs",
                "details": {
                    "error": {
                        "message": "Callback URL mismatch. http://localhost:3000/callback is not in the list of allowed callback URLs",
                        "oauthError": "Callback URL mismatch. http://localhost:3000/callback is not in the list of allowed callback URLs. Please go to 'https://manage.auth0.com/#/applications/aI61p8I8aFjmYRliLWgvM9ev97kCCNDB/settings' and make sure you are sending the same callback url from your application.",
                        "payload": {
                            "attempt": "http://localhost:3000/callback",
                            "client": {
                                "clientID": "aI61p8I8aFjmYRliLWgvM9ev97kCCNDB"
                            },
                            "code": "unauthorized_client",
                            "message": "Callback URL mismatch. http://localhost:3000/callback is not in the list of allowed callback URLs",
                            "name": "CallbackMismatchError",
                            "status": 403
                        },
                        "type": "callback-url-mismatch"
                    },
                    "qs": {
                        "client_id": "aI61p8I8aFjmYRliLWgvM9ev97kCCNDB",
                        "redirect_uri": "http://localhost:3000/callback",
                        "response_type": "code",
                        "scope": "openid profile",
                        "state": "Vz6G2zZf95/FCOQALrpvd4bS6jx5xvRos2pVldFAiw4="
                    }
                },
                "hostname": "dev-yoj8axza.au.auth0.com",
                "type": "Failed login",
                "type_id": "f"
            }
        }
    },
    "data_stream": {
        "dataset": "auth0.logs",
        "namespace": "49995",
        "type": "logs"
    },
    "ecs": {
        "version": "8.11.0"
    },
    "elastic_agent": {
        "id": "0f4499f8-3f89-4f53-945d-1f033cc2bf93",
        "snapshot": false,
        "version": "8.18.1"
    },
    "event": {
        "action": "failed-login",
        "agent_id_status": "verified",
        "category": [
            "authentication"
        ],
        "dataset": "auth0.logs",
        "id": "90020211103030609732115389415260839021644201259064885298",
        "ingested": "2025-05-30T14:06:51Z",
        "kind": "event",
        "original": "{\"data\":{\"connection_id\":\"\",\"date\":\"2021-11-03T03:06:05.696Z\",\"description\":\"Callback URL mismatch. http://localhost:3000/callback is not in the list of allowed callback URLs\",\"details\":{\"body\":{},\"error\":{\"message\":\"Callback URL mismatch. http://localhost:3000/callback is not in the list of allowed callback URLs\",\"oauthError\":\"Callback URL mismatch. http://localhost:3000/callback is not in the list of allowed callback URLs. Please go to 'https://manage.auth0.com/#/applications/aI61p8I8aFjmYRliLWgvM9ev97kCCNDB/settings' and make sure you are sending the same callback url from your application.\",\"payload\":{\"attempt\":\"http://localhost:3000/callback\",\"authorized\":[],\"client\":{\"clientID\":\"aI61p8I8aFjmYRliLWgvM9ev97kCCNDB\"},\"code\":\"unauthorized_client\",\"message\":\"Callback URL mismatch. http://localhost:3000/callback is not in the list of allowed callback URLs\",\"name\":\"CallbackMismatchError\",\"status\":403},\"type\":\"callback-url-mismatch\"},\"qs\":{\"client_id\":\"aI61p8I8aFjmYRliLWgvM9ev97kCCNDB\",\"redirect_uri\":\"http://localhost:3000/callback\",\"response_type\":\"code\",\"scope\":\"openid profile\",\"state\":\"Vz6G2zZf95/FCOQALrpvd4bS6jx5xvRos2pVldFAiw4=\"}},\"hostname\":\"dev-yoj8axza.au.auth0.com\",\"ip\":\"81.2.69.143\",\"log_id\":\"90020211103030609732115389415260839021644201259064885298\",\"type\":\"f\",\"user_agent\":\"Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:93.0) Gecko/20100101 Firefox/93.0\"},\"log_id\":\"90020211103030609732115389415260839021644201259064885298\"}",
        "outcome": "failure",
        "type": [
            "info"
        ]
    },
    "input": {
        "type": "http_endpoint"
    },
    "log": {
        "level": "error"
    },
    "network": {
        "type": "ipv4"
    },
    "source": {
        "geo": {
            "city_name": "London",
            "continent_name": "Europe",
            "country_iso_code": "GB",
            "country_name": "United Kingdom",
            "location": {
                "lat": 51.5142,
                "lon": -0.0931
            },
            "region_iso_code": "GB-ENG",
            "region_name": "England"
        },
        "ip": "81.2.69.143"
    },
    "tags": [
        "preserve_original_event",
        "forwarded",
        "auth0-logstream"
    ],
    "user_agent": {
        "device": {
            "name": "Other"
        },
        "name": "Firefox",
        "original": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:93.0) Gecko/20100101 Firefox/93.0",
        "os": {
            "name": "Ubuntu"
        },
        "version": "93.0"
    }
}
```
