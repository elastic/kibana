README.md for developers working on the backend detection engine on how to get started
using the CURL scripts in the scripts folder.

The scripts rely on CURL and jq:

- [CURL](https://curl.haxx.se)
- [jq](https://stedolan.github.io/jq/)

Install curl and jq

```sh
brew update
brew install curl
brew install jq
```

Open `$HOME/.zshrc` or `${HOME}.bashrc` depending on your SHELL output from `echo $SHELL`
and add these environment variables:

```sh
export ELASTICSEARCH_USERNAME=${user}
export ELASTICSEARCH_PASSWORD=${password}
export ELASTICSEARCH_URL=https://${ip}:9200
export KIBANA_URL=http://localhost:5601
export TASK_MANAGER_INDEX=.kibana-task-manager-${your user id}
export KIBANA_INDEX=.kibana-${your user id}
```

source `$HOME/.zshrc` or `${HOME}.bashrc` to ensure variables are set:

```sh
source ~/.zshrc
```

Open your `kibana.dev.yml` file and add these lines:

```sh
xpack.security_solution.signalsIndex: .siem-signals-${your user id}
```

Restart Kibana and ensure that you are using `--no-base-path` as changing the base path is a feature but will
get in the way of the CURL scripts written as is. You should see alerting and actions starting up like so afterwards

```sh
server log [22:05:22.277] [info][status][plugin:alerting@8.0.0] Status changed from uninitialized to green - Ready
server log [22:05:22.270] [info][status][plugin:actions@8.0.0] Status changed from uninitialized to green - Ready
```

Go to the scripts folder `cd kibana/x-pack/plugins/security_solution/server/lib/detection_engine/scripts` and run:

```sh
./hard_reset.sh
./post_rule.sh
```

which will:

- Delete any existing actions you have
- Delete any existing alerts you have
- Delete any existing alert tasks you have
- Delete any existing signal mapping, policies, and template, you might have previously had.
- Add the latest signal index and its mappings using your settings from `kibana.dev.yml` environment variable of `xpack.securitySolution.signalsIndex`.
- Posts the sample rule from `./rules/queries/query_with_rule_id.json`
- The sample rule checks for root or admin every 5 minutes and reports that as a signal if it is a positive hit

Now you can run

```sh
./find_rules.sh
```

You should see the new rules created like so:

```sh
{
  "page": 1,
  "perPage": 20,
  "total": 1,
  "data": [
    {
      "created_by": "elastic",
      "description": "Detecting root and admin users",
      "enabled": true,
      "false_positives": [],
      "from": "now-6m",
      "id": "a556065c-0656-4ba1-ad64-a77ca9d2013b",
      "immutable": false,
      "index": [
        "auditbeat-*",
        "filebeat-*",
        "packetbeat-*",
        "winlogbeat-*"
      ],
      "interval": "5m",
      "rule_id": "rule-1",
      "language": "kuery",
      "output_index": ".siem-signals-some-name",
      "max_signals": 100,
      "risk_score": 1,
      "name": "Detect Root/Admin Users",
      "query": "user.name: root or user.name: admin",
      "references": [
        "http://www.example.com",
        "https://ww.example.com"
      ],
      "severity": "high",
      "updated_by": "elastic",
      "tags": [],
      "to": "now",
      "type": "query"
    }
  ]
}
```

Every 5 minutes if you get positive hits you will see messages on info like so:

```sh
server log [09:54:59.013] [info][plugins][siem] Total signals found from signal rule "id: a556065c-0656-4ba1-ad64-a77ca9d2013b", "ruleId: rule-1": 10000
```

Rules are [space aware](https://www.elastic.co/guide/en/kibana/master/xpack-spaces.html) and default
to the "default" (empty) URL space if you do not export the variable of `SPACE_URL`. Example, if you want to
post rules to `test-space` you set `SPACE_URL` to be:

```sh
export SPACE_URL=/s/test-space
```

The `${SPACE_URL}` is in front of all the APIs to correctly create, modify, delete, and update
them from within the defined space. If this variable is not defined the default which is the url of an
empty string will be used.

Add the `.siem-signals-${your user id}` to your advanced SIEM settings to see any signals
created which should update once every 5 minutes at this point.

Also add the `.siem-signals-${your user id}` as a kibana index for Maps to be able to see the
signals

Optionally you can add these debug statements to your `kibana.dev.yml` to see more information when running the detection
engine

```sh
logging.verbose: true
logging.events:
  {
    log: ['security_solution', 'info', 'warning', 'error', 'fatal'],
    request: ['info', 'warning', 'error', 'fatal'],
    error: '*',
    ops: __no-ops__,
  }
```

See these two README.md's pages for more references on the alerting and actions API:
https://github.com/elastic/kibana/blob/master/x-pack/plugins/alerts/README.md
https://github.com/elastic/kibana/tree/master/x-pack/plugins/actions

### Signals API

To update the status of a signal or group of signals, the following scripts provide an example of how to
go about doing so.
`cd x-pack/plugins/security_solution/server/lib/detection_engine/scripts`
`./signals/put_signal_doc.sh` will post a sample signal doc into the signals index to play with
`./signals/set_status_with_id.sh closed` will update the status of the sample signal to closed
`./signals/set_status_with_id.sh open` will update the status of the sample signal to open
`./signals/set_status_with_query.sh closed` will update the status of the signals in the result of the query to closed.
`./signals/set_status_with_query.sh open` will update the status of the signals in the result of the query to open.

### Large List Exceptions

To test out the functionality of large lists with rules, the user will need to import a list and post a rule with a reference to that exception list. The following outlines an example using the sample json rule provided in the repo.

* First, set the appropriate env var in order to enable exceptions features`export ELASTIC_XPACK_SECURITY_SOLUTION_LISTS_FEATURE=true` and `export ELASTIC_XPACK_SECURITY_SOLUTION_EXCEPTIONS_LISTS=true` and start kibana
* Second, import a list of ips from a file called `ci-badguys.txt`. The command should look like this:
`cd $HOME/kibana/x-pack/plugins/lists/server/scripts && ./import_list_items_by_filename.sh ip ~/ci-badguys.txt`
* Then, from the detection engine scripts folder (`cd kibana/x-pack/plugins/security_solution/server/lib/detection_engine/scripts`) run `./post_rule.sh rules/queries/lists/query_with_list_plugin.json`
