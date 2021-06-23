#!/usr/bin/env bash

# This will create 3 actions and 1 alert that runs those actions.
# The actions run will need to do action-specific escaping for the
# actions to work correctly, which was fixed in 7.11.0.
#
# The actions run are Slack, Webhook, and email.  The Webhook action also
# posts to the same Slack webhook.  The email posts to maildev.
#
# After running the script, check Slack and the maildev web interface
# to make sure the actions ran appropriately.  You can also edit the
# alert name to other interesting text to see how it renders.
#
# you will need the following env vars set for Slack:
#   SLACK_WEBHOOKURL
#
# expects you're running maildev with the default options via
#   npx maildev
#
# you'll need jq installed
#   https://stedolan.github.io/jq/download/

KIBANA_URL=https://elastic:changeme@localhost:5601

# create email action
ACTION_ID_EMAIL=`curl -X POST --insecure --silent \
  $KIBANA_URL/api/actions/action \
  -H "kbn-xsrf: foo" -H "content-type: application/json" \
  -d '{
    "actionTypeId": ".email",
    "name": "email for action_param_templates test",
    "config": {
      "from": "team-alerting@example.com",
      "host": "localhost",
      "port": 1025
    },
    "secrets": {
    }
  }' | jq -r '.id'`
echo "email action id:   $ACTION_ID_EMAIL"

# create slack action
ACTION_ID_SLACK=`curl -X POST --insecure --silent \
  $KIBANA_URL/api/actions/action \
  -H "kbn-xsrf: foo" -H "content-type: application/json" \
  -d "{
    \"actionTypeId\": \".slack\",
    \"name\": \"slack for action_param_templates test\",
    \"config\": {
    },
    \"secrets\": {
      \"webhookUrl\": \"$SLACK_WEBHOOKURL\"
    }
  }" | jq -r '.id'`
echo "slack action id:   $ACTION_ID_SLACK"

# create webhook action
ACTION_ID_WEBHOOK=`curl -X POST --insecure --silent \
  $KIBANA_URL/api/actions/action \
  -H "kbn-xsrf: foo" -H "content-type: application/json" \
  -d "{
    \"actionTypeId\": \".webhook\",
    \"name\": \"webhook for action_param_templates test\",
    \"config\": {
      \"url\": \"$SLACK_WEBHOOKURL\",
      \"headers\": { \"Content-type\": \"application/json\" }
    },
    \"secrets\": {
    }
  }" | jq -r '.id'`
echo "webhook action id: $ACTION_ID_WEBHOOK"

WEBHOOK_BODY="{ \\\"text\\\": \\\"text from webhook {{alertName}}\\\" }"

# create alert
ALERT_ID=`curl -X POST --insecure --silent \
  $KIBANA_URL/api/alerts/alert \
  -H "kbn-xsrf: foo" -H "content-type: application/json" \
  -d "{
    \"alertTypeId\": \".index-threshold\",
    \"name\": \"alert for action_param_templates test\u000awith newline and *bold*\",
    \"schedule\": { \"interval\": \"30s\" },
    \"consumer\": \"alerts\",
    \"tags\": [],
    \"actions\": [
      {
        \"group\": \"threshold met\",
        \"id\": \"$ACTION_ID_EMAIL\",
        \"params\":{
          \"to\": [\"team-alerting@example.com\"],
          \"subject\": \"subject {{alertName}}\",
          \"message\": \"message {{alertName}}\"
        }
      },
      {
        \"group\": \"threshold met\",
        \"id\": \"$ACTION_ID_SLACK\",
        \"params\":{
          \"message\": \"message from slack {{alertName}}\"
        }
      },
      {
        \"group\": \"threshold met\",
        \"id\": \"$ACTION_ID_WEBHOOK\",
        \"params\":{
          \"body\": \"$WEBHOOK_BODY\"
        }
      }
    ],
    \"params\": {
      \"index\": [\".kibana\"], 
      \"timeField\": \"updated_at\",
      \"aggType\": \"count\",
      \"groupBy\": \"all\",
      \"timeWindowSize\": 100,
      \"timeWindowUnit\": \"d\",
      \"thresholdComparator\": \">\",
      \"threshold\":[0]
    }
  }" #| jq -r '.id'`
echo "alert id:          $ALERT_ID"
