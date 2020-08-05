These are example POST rules that have the ability to use saved query id's and optionally
queries and filters. If you only use a saved query id, then detection engine relies on that
saved query id existing or it will throw errors if the user deletes the saved query id. If you
add a saved query id along side with a filter and/or query then it will try to use the saved query
id first and if that fails it will fall back on the provided filter and/or query.

Every single json file should have the field:

```sh
"type": "saved_query"
```

set which is what designates it as a type of saved_query

To post all of them to see in the UI, with the scripts folder as your current working directory:

```sh
./post_rule.sh ./rules/saved_queries/*.json
```

To post only one at a time:

```sh
./post_rule.sh ./rules/saved_queries/<filename>.json
```

If the saved_id does not exist and you do not provide a query and/or filter then expect to see this
in your kibana console logging:

```sh
server log [11:48:33.331] [error][task_manager] Task alerting:siem.signals "fedc2390-1858-11ea-9184-15f04d7099dc" failed: Error: Saved object [query/test-saved-id] not found
```
