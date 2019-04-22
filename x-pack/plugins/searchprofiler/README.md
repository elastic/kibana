# Profiler

A UI for the query and aggregation profiler in Elasticsearch

## Development

Assuming you've checked out x-plugins next to kibana...

- Run `yarn kbn bootstrap`
- Run `yarn start` to watch for and sync files on change
- Open a new terminal to run Kibana - use `yarn start` to launch it in dev mode
  - Kibana will automatically restart as files are synced
  - If you need debugging output, run `DEBUG=reporting yarn start` instead

If you have installed this somewhere other than via x-plugins, and next to the kibana repo, you'll need to change the `pathToKibana` setting in `gulpfile.js`

## Testing

To run the server tests, change into `x-plugins/kibana` and run:

```bash
mocha --debug --compilers js:@babel/register plugins/profiler/**/__tests__/**/*.js
```


--kbnServer.tests_bundle.pluginId
