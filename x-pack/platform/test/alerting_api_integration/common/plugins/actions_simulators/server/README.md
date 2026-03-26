functional test server slack simulator
================================================================================

The code in this directory includes external service simulators for testing
Kibana actions.  The simulators are available when running the function test
server.

They are used during function testing for actions; an action will be created
pointing to the simulator, and then messages posted to test handling different
error conditions.

Generally, the simulator will generate specialized http responses based on
some string property passed as input.  Consult the simulators for more details.

simulator usage
--------------------------------------------------------------------------------

This may get out of date, consult the code for exact urls and inputs.  Each
simulator's last path segment should be the name of the service (eg, slack,
pagerduty, etc).

```console
$ export SLACK_URL=http://elastic:changeme@localhost:5620/api/_actions-FTS-external-service-simulators/slack

$ curl -v $SLACK_URL -H 'content-type: application/json' -d '{"text":"success"}'
< HTTP/1.1 200 OK
...
ok

$ curl -v $SLACK_URL -H 'content-type: application/json' -d '{"text":"rate_limit"}'
< HTTP/1.1 429 Too Many Requests
...
< retry-after: 1
<
{"retry_after":1,"ok":false,"error":"rate_limited"}
```

bonus points: abuse a slack server
--------------------------------------------------------------------------------

To get a rate limiting slack response, from a real slack server, to see what it
looks like, run this in one terminal window, and while that is running, run a
normal curl command to post a message.  You may need to try a few times.

You should probably do this with a personal slack instance, not a company one :-)

```console
$ autocannon --amount 10000 --method POST --body '{"text":"Hello, World!"}' $SLACK_WEBHOOK_URL
```

