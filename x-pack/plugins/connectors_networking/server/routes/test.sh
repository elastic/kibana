#!/usr/bin/env bash

# this script requires the following to be installed:
#   - jq           https://stedolan.github.io/jq/
#   - kbn-action   https://github.com/pmuellr/kbn-action

export KBN_URLBASE=https://elastic:changeme@localhost:5601

# create a webhook connector pointing into Kibana, which should return a 404
BOLD_ON="\033[1m"
BOLD_OFF="\033[0m"
export ACTION_ID=`kbn-action create .webhook "webhook to Kibana" '{
    url: "https://localhost:5601"
  }' '{
    user: "elastic", password: "changeme"
  }' | jq -r '.id'`
echo -e "${BOLD_ON}created webhook with action id: $ACTION_ID${BOLD_OFF}"

# create a connectors networking options (CNO) object for Kibana, that should be
# used by the connector created above
export OPTIONS_ID=`curl -k -s -X POST \
  -H "content-type: application/json" -H "kbn-xsrf: foo" \
  $KBN_URLBASE/api/connectors_networking -d '
{
  "url": "https://localhost:5601",
  "name": "networking options for accessing Kibana",
  "tls": {
    "reject_unauthorized": false
  }
}' | jq -r '.id'`
echo -e "${BOLD_ON}created options object with id: $OPTIONS_ID${BOLD_OFF}"
echo -e "note: if the id is 'null', something went wrong${BOLD_OFF}"

# get the CNO object by id
echo -e "\n${BOLD_ON}getting the options object by id${BOLD_OFF}"
curl -k -s $KBN_URLBASE/api/connectors_networking/options/$OPTIONS_ID

# find the CNO by URL
echo -e "\n\n${BOLD_ON}find the options object via url${BOLD_OFF}"
curl -k -s -X POST \
  -H "content-type: application/json" -H "kbn-xsrf: foo" \
  $KBN_URLBASE/api/connectors_networking/_find_for_url -d '
{
  "url": "https://localhost:5601"
}'

# update the CNO to set reject_unauthenticated to true
echo -e "\n\n${BOLD_ON}update the options object to set reject_unauthorized: true${BOLD_OFF}"
curl -k -s -X PUT \
  -H "content-type: application/json" -H "kbn-xsrf: foo" \
  $KBN_URLBASE/api/connectors_networking/options/$OPTIONS_ID -d '
{
  "url": "https://localhost:5601",
  "name": "name updated",
  "tls": {
    "reject_unauthorized": true
  }
}'

# execute the webhook, should fail with a cert error
echo -e "\n\n${BOLD_ON}invoke the webhook action, should fail with a cert error${BOLD_OFF}"
kbn-action execute $ACTION_ID '{}'

# update the CNO to set reject_unauthenticated to false
echo -e "\n${BOLD_ON}update the options object to set reject_unauthorized: false${BOLD_OFF}"
curl -k -s -X PUT \
  -H "content-type: application/json" -H "kbn-xsrf: foo" \
  $KBN_URLBASE/api/connectors_networking/options/$OPTIONS_ID -d '
{
  "url": "https://localhost:5601",
  "name": "name updated",
  "tls": {
    "reject_unauthorized": false
  }
}'

# execute the webhook, should fail with a 404 error
echo -e "\n\n${BOLD_ON}invoke the webhook action, should get a 404 so it got through${BOLD_OFF}"
kbn-action execute $ACTION_ID '{}'

# update the CNO to delete reject_unauthenticated; now this setting is driven
# off the global actions setting
echo -e "\n${BOLD_ON}update the options object to set reject_unauthorized: null${BOLD_OFF}"
curl -k -s -X PUT \
  -H "content-type: application/json" -H "kbn-xsrf: foo" \
  $KBN_URLBASE/api/connectors_networking/options/$OPTIONS_ID -d '
{
  "url": "https://localhost:5601",
  "name": "name updated",
  "tls": {
    "reject_unauthorized": null
  }
}'

# may fail with either cert or 404 error, depending on global reject_authenticated setting
echo -e "\n\n${BOLD_ON}invoke the webhook action, this time pass/fail based on global rejectUnauthorized setting${BOLD_OFF}"
kbn-action execute $ACTION_ID '{}'

# update the CNO to use the kibana dev ca, should get 404
# see files in: /packages/kbn-dev-utils/certs - ca.crt
echo -e "\n${BOLD_ON}update the options object to use the kibana dev ca pem${BOLD_OFF}"
CA_PEM='-----BEGIN CERTIFICATE-----\nMIIDSzCCAjOgAwIBAgIUW0brhEtYK3tUBYlXnUa+AMmAX6kwDQYJKoZIhvcNAQEL\nBQAwNDEyMDAGA1UEAxMpRWxhc3RpYyBDZXJ0aWZpY2F0ZSBUb29sIEF1dG9nZW5l\ncmF0ZWQgQ0EwIBcNMTkxMjI3MTcwMjMyWhgPMjA2OTEyMTQxNzAyMzJaMDQxMjAw\nBgNVBAMTKUVsYXN0aWMgQ2VydGlmaWNhdGUgVG9vbCBBdXRvZ2VuZXJhdGVkIENB\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAplO5m5Xy8xERyA0/G5SM\nNu2QXkfS+m7ZTFjSmtwqX7BI1I6ISI4Yw8QxzcIgSbEGlSqb7baeT+A/1JQj0gZN\nKOnKbazl+ujVRJpsfpt5iUsnQyVPheGekcHkB+9WkZPgZ1oGRENr/4Eb1VImQf+Y\nyo/FUj8X939tYW0fficAqYKv8/4NWpBUbeop8wsBtkz738QKlmPkMwC4FbuF2/bN\nvNuzQuRbGMVmPeyivZJRfDAMKExoXjCCLmbShdg4dUHsUjVeWQZ6s4vbims+8qF9\nb4bseayScQNNU3hc5mkfhEhSM0KB0lDpSvoCxuXvXzb6bOk7xIdYo+O4vHUhvSkQ\nmwIDAQABo1MwUTAdBgNVHQ4EFgQUGu0mDnvDRnBdNBG8DxwPdWArB0kwHwYDVR0j\nBBgwFoAUGu0mDnvDRnBdNBG8DxwPdWArB0kwDwYDVR0TAQH/BAUwAwEB/zANBgkq\nhkiG9w0BAQsFAAOCAQEASv/FYOwWGnQreH8ulcVupGeZj25dIjZiuKfJmslH8QN/\npVCIzAxNZjGjCpKxbJoCu5U9USaBylbhigeBJEq4wmYTs/WPu4uYMgDj0MILuHin\nRQqgEVG0uADGEgH2nnk8DeY8gQvGpJRQGlXNK8pb+pCsy6F8k/svGOeBND9osHfU\nCVEo5nXjfq6JCFt6hPx7kl4h3/j3C4wNy/Dv/QINdpPsl6CnF17Q9R9d60WFv42/\npkl7W1hszCG9foNJOJabuWfVoPkvKQjoCvPitZt/hCaFZAW49PmAVhK+DAohQ91l\nTZhDmYqHoXNiRDQiUT68OS7RlfKgNpr/vMTZXDxpmw==\n-----END CERTIFICATE-----\n'

curl -k -s -X PUT \
  -H "content-type: application/json" -H "kbn-xsrf: foo" \
  $KBN_URLBASE/api/connectors_networking/options/$OPTIONS_ID -d "
{
  \"url\": \"https://localhost:5601\",
  \"name\": \"name updated\",
  \"tls\": {
    \"ca\": \"$CA_PEM\",
    \"reject_unauthorized\": true
  }
}"

# execute the webhook, should fail with a 404 error
echo -e "\n\n${BOLD_ON}invoke the webhook action, should get a 404 so it got through${BOLD_OFF}"
kbn-action execute $ACTION_ID '{}'

# delete the CNO
echo -e "\n${BOLD_ON}delete the options object${BOLD_OFF}"
curl -k -s -X DELETE -H "kbn-xsrf: foo" $KBN_URLBASE/api/connectors_networking/options/$OPTIONS_ID

# make sure the CNO got deleted
echo -e "\n\n${BOLD_ON}find all the options objects, should be empty${BOLD_OFF}"
curl -k -s $KBN_URLBASE/api/connectors_networking/_find
