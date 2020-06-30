These are example POST rules that only have queries and and no filters in them.

Every single json file should have the field:

```sh
"type": "query"
```

set which is what designates it as a type of query.

To post all of them to see in the UI, with the scripts folder as your current working directory.

```sh
./post_rule.sh ./rules/queries/*.json
```

To post only one at a time:

```sh
./post_rule.sh ./rules/queries/<filename>.json
```
