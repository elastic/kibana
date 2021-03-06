# Kibana Connectors Networking

Manages server-specific networking options for Kibana Connectors.

## ad-hoc testing

### create a new options object

_note that node doesn't support TLSv1.3, so the connector should not work_

```bash
export OPTIONS_ID=`curl -k -X POST \
  -H "content-type: application/json" -H "kbn-xsrf: foo" \
  $KBN_URLBASE/api/connectors_networking -d '
{
  "name": "my little localhost",
  "protocol": "https",
  "hostname": "localhost",
  "port": 5601,
  "tls": {
    "reject_unauthorized": true,
    "min_version": "TLSv1.3"
  }
}' | jq -r '.id'`
echo networking_connections options created: $OPTIONS_ID
```

### find all options objects

```bash
curl -k $KBN_URLBASE/api/connectors_networking/_find | json
```

### find the options object for a specific URL

```bash
curl -k -X POST \
  -H "content-type: application/json" -H "kbn-xsrf: foo" \
  $KBN_URLBASE/api/connectors_networking/_find_for_url -d '
{
  "url": "https://localhost:5601"
}' | json
```

### update an options object

```bash
curl -k -X PUT \
  -H "content-type: application/json" -H "kbn-xsrf: foo" \
  $KBN_URLBASE/api/connectors_networking/options/$OPTIONS_ID -d '
{
  "name": "name updated",
  "protocol": "https",
  "hostname": "localhost2",
  "port": 5602,
  "tls": {
    "reject_unauthorized": false,
    "min_version": "TLSv1.2"
  }
}' | json
```

### delete an options object

```bash
curl -k -X DELETE -H "kbn-xsrf: foo" $KBN_URLBASE/api/connectors_networking/options/$OPTIONS_ID
```
