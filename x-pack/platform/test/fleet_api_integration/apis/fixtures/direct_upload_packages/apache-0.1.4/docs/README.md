# Apache Integration

This integration periodically fetches metrics from [Apache](https://httpd.apache.org/) servers. It can parse access and error
logs created by the Apache server.

## Compatibility

The Apache datasets were tested with Apache 2.4.12 and 2.4.20 and are expected to work with
all versions >= 2.2.31 and >= 2.4.16.

## Logs

### Access Logs

Access logs collects the Apache access logs.

**Exported fields**

| Field | Description | Type |
|---|---|---|
| @timestamp | Event timestamp. | date |
| apache.access.ssl.cipher | SSL cipher name. | keyword |
| apache.access.ssl.protocol | SSL protocol version. | keyword |
| data_stream.dataset | Data stream dataset. | constant_keyword |
| data_stream.namespace | Data stream namespace. | constant_keyword |
| data_stream.type | Data stream type. | constant_keyword |
| http.request.method | HTTP request method. Prior to ECS 1.6.0 the following guidance was provided: "The field value must be normalized to lowercase for querying." As of ECS 1.6.0, the guidance is deprecated because the original case of the method may be useful in anomaly detection.  Original case will be mandated in ECS 2.0.0 | keyword |
| http.request.referrer | Referrer for this HTTP request. | keyword |
| http.response.body.bytes | Size in bytes of the response body. | long |
| http.response.status_code | HTTP response status code. | long |
| http.version | HTTP version. | keyword |
| log.level | Original log level of the log event. If the source of the event provides a log level or textual severity, this is the one that goes in `log.level`. If your source doesn't specify one, you may put your event transport's severity here (e.g. Syslog severity). Some examples are `warn`, `err`, `i`, `informational`. | keyword |
| message | For log events the message field contains the log message, optimized for viewing in a log viewer. For structured logs without an original message field, other fields can be concatenated to form a human-readable summary of the event. If multiple messages exist, they can be combined into one message. | text |
| process.pid | Process id. | long |
| process.thread.id | Thread ID. | long |
| source.address | Some event source addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field. Then it should be duplicated to `.ip` or `.domain`, depending on which one it is. | keyword |
| source.geo.city_name | City name. | keyword |
| source.geo.continent_name | Name of the continent. | keyword |
| source.geo.country_iso_code | Country ISO code. | keyword |
| source.geo.location | Longitude and latitude. | geo_point |
| source.geo.region_iso_code | Region ISO code. | keyword |
| source.geo.region_name | Region name. | keyword |
| url.original | Unmodified original url as seen in the event source. Note that in network monitoring, the observed URL may be a full URL, whereas in access logs, the URL is often just represented as a path. This field is meant to represent the URL as it was observed, complete or not. | keyword |
| user.name | Short name or login of the user. | keyword |
| user_agent.device.name | Name of the device. | keyword |
| user_agent.name | Name of the user agent. | keyword |
| user_agent.original | Unparsed user_agent string. | keyword |
| user_agent.os.name | Operating system name, without the version. | keyword |
| user_agent.os.version | Operating system version as a raw string. | keyword |
| user_agent.version | Version of the user agent. | keyword |


### Error Logs

Error logs collects the Apache error logs.

**Exported fields**

| Field | Description | Type |
|---|---|---|
| @timestamp | Event timestamp. | date |
| apache.error.module | The module producing the logged message. | keyword |
| data_stream.dataset | Data stream dataset. | constant_keyword |
| data_stream.namespace | Data stream namespace. | constant_keyword |
| data_stream.type | Data stream type. | constant_keyword |
| http.request.method | HTTP request method. Prior to ECS 1.6.0 the following guidance was provided: "The field value must be normalized to lowercase for querying." As of ECS 1.6.0, the guidance is deprecated because the original case of the method may be useful in anomaly detection.  Original case will be mandated in ECS 2.0.0 | keyword |
| http.request.referrer | Referrer for this HTTP request. | keyword |
| http.response.body.bytes | Size in bytes of the response body. | long |
| http.response.status_code | HTTP response status code. | long |
| http.version | HTTP version. | keyword |
| log.level | Original log level of the log event. If the source of the event provides a log level or textual severity, this is the one that goes in `log.level`. If your source doesn't specify one, you may put your event transport's severity here (e.g. Syslog severity). Some examples are `warn`, `err`, `i`, `informational`. | keyword |
| message | For log events the message field contains the log message, optimized for viewing in a log viewer. For structured logs without an original message field, other fields can be concatenated to form a human-readable summary of the event. If multiple messages exist, they can be combined into one message. | text |
| process.pid | Process id. | long |
| process.thread.id | Thread ID. | long |
| source.address | Some event source addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field. Then it should be duplicated to `.ip` or `.domain`, depending on which one it is. | keyword |
| source.geo.city_name | City name. | keyword |
| source.geo.continent_name | Name of the continent. | keyword |
| source.geo.country_iso_code | Country ISO code. | keyword |
| source.geo.location | Longitude and latitude. | geo_point |
| source.geo.region_iso_code | Region ISO code. | keyword |
| source.geo.region_name | Region name. | keyword |
| url.original | Unmodified original url as seen in the event source. Note that in network monitoring, the observed URL may be a full URL, whereas in access logs, the URL is often just represented as a path. This field is meant to represent the URL as it was observed, complete or not. | keyword |
| user.name | Short name or login of the user. | keyword |
| user_agent.device.name | Name of the device. | keyword |
| user_agent.name | Name of the user agent. | keyword |
| user_agent.original | Unparsed user_agent string. | keyword |
| user_agent.os.name | Operating system name, without the version. | keyword |


## Metrics

### Status Metrics

The server status stream collects data from the Apache Status module. It scrapes the status data from the web page
generated by the `mod_status` module.

An example event for `status` looks as following:

```$json
{
  "@metadata": {
    "beat": "metricbeat",
    "raw_index": "metrics-apache.status-default",
    "type": "_doc",
    "version": "8.0.0"
  },
  "@timestamp": "2020-06-24T10:19:48.005Z",
  "agent": {
    "ephemeral_id": "685f03e4-76e7-4d05-b398-8454b8964681",
    "id": "a74466da-3ea4-44f9-aea0-11c5e4b920be",
    "name": "MacBook-Elastic.local",
    "type": "metricbeat",
    "version": "8.0.0"
  },
  "apache": {
    "status": {
      "bytes_per_request": 94.0933,
      "bytes_per_sec": 83.6986,
      "connections": {
        "async": {
          "closing": 0,
          "keep_alive": 0,
          "writing": 0
        },
        "total": 0
      },
      "cpu": {
        "children_system": 0,
        "children_user": 0,
        "load": 0.185185,
        "system": 1.79,
        "user": 1.11
      },
      "hostname": "127.0.0.1:8088",
      "load": {
        "1": 3.58,
        "15": 2.79,
        "5": 3.54
      },
      "requests_per_sec": 0.889527,
      "scoreboard": {
        "closing_connection": 0,
        "dns_lookup": 0,
        "gracefully_finishing": 0,
        "idle_cleanup": 0,
        "keepalive": 0,
        "logging": 0,
        "open_slot": 325,
        "reading_request": 0,
        "sending_reply": 1,
        "starting_up": 0,
        "total": 400,
        "waiting_for_connection": 74
      },
      "total_accesses": 1393,
      "total_kbytes": 128,
      "uptime": {
        "server_uptime": 1566,
        "uptime": 1566
      },
      "workers": {
        "busy": 1,
        "idle": 74
      }
    }
  },
  "dataset": {
    "name": "apache.status",
    "namespace": "default",
    "type": "metrics"
  },
  "ecs": {
    "version": "1.5.0"
  },
  "event": {
    "dataset": "apache.status",
    "duration": 2381832,
    "module": "apache"
  },
  "metricset": {
    "name": "status",
    "period": 10000
  },
  "service": {
    "address": "127.0.0.1:8088",
    "type": "apache"
  },
  "stream": {
    "dataset": "apache.status",
    "namespace": "default",
    "type": "metrics"
  }
}
```

**Exported fields**

| Field | Description | Type |
|---|---|---|
| @timestamp | Event timestamp. | date |
| apache.status.bytes_per_request | Bytes per request. | scaled_float |
| apache.status.bytes_per_sec | Bytes per second. | scaled_float |
| apache.status.connections.async.closing | Async closed connections. | long |
| apache.status.connections.async.keep_alive | Async keeped alive connections. | long |
| apache.status.connections.async.writing | Async connection writing. | long |
| apache.status.connections.total | Total connections. | long |
| apache.status.cpu.children_system | CPU of children system. | scaled_float |
| apache.status.cpu.children_user | CPU of children user. | scaled_float |
| apache.status.cpu.load | CPU Load. | scaled_float |
| apache.status.cpu.system | System cpu. | scaled_float |
| apache.status.cpu.user | CPU user load. | scaled_float |
| apache.status.hostname | Apache hostname. | keyword |
| apache.status.load.1 | Load average for the last minute. | scaled_float |
| apache.status.load.15 | Load average for the last 15 minutes. | scaled_float |
| apache.status.load.5 | Load average for the last 5 minutes. | scaled_float |
| apache.status.requests_per_sec | Requests per second. | scaled_float |
| apache.status.scoreboard.closing_connection | Closing connections. | long |
| apache.status.scoreboard.dns_lookup | Dns Lookups. | long |
| apache.status.scoreboard.gracefully_finishing | Gracefully finishing. | long |
| apache.status.scoreboard.idle_cleanup | Idle cleanups. | long |
| apache.status.scoreboard.keepalive | Keep alive. | long |
| apache.status.scoreboard.logging | Logging | long |
| apache.status.scoreboard.open_slot | Open slots. | long |
| apache.status.scoreboard.reading_request | Reading requests. | long |
| apache.status.scoreboard.sending_reply | Sending Reply. | long |
| apache.status.scoreboard.starting_up | Starting up. | long |
| apache.status.scoreboard.total | Total. | long |
| apache.status.scoreboard.waiting_for_connection | Waiting for connections. | long |
| apache.status.total_accesses | Total number of access requests. | long |
| apache.status.total_kbytes | Total number of kilobytes served. | long |
| apache.status.uptime.server_uptime | Server uptime in seconds. | long |
| apache.status.uptime.uptime | Server uptime. | long |
| apache.status.workers.busy | Number of busy workers. | long |
| apache.status.workers.idle | Number of idle workers. | long |
| data_stream.dataset | Data stream dataset. | constant_keyword |
| data_stream.namespace | Data stream namespace. | constant_keyword |
| data_stream.type | Data stream type. | constant_keyword |

