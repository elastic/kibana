# metrics_entities

Metrics entities where you can add transforms for metrics and entities.

The transform jobs are on the file system as:
 - modules (The different logical pieces)
  
When you create a "group" of transforms you can create them using an optional prefix to separate things based on queries, security concerns, or different Kibana spaces.
---

## Scripts

TODO: Add a note about scripts, setup, and running

## Development

TODO: Add how to develop here

## TODO List
- Add these properties to the route which are:
  - disable_transforms,
  - pipeline,
   - Change the REST routes on post to change the indexes for whichever indexes you want
 - Unit tests to ensure the data of the mapping.json includes the correct fields such as
   _meta, at least one alias, a mapping section, etc... 
 - Add text/keyword and other things to the mappings (not just keyword maybe?) ... At least review them one more time
 - Module (server/modules) templating with variables and then push those variables down? (Maybe we don't need them)
 - Add feature flag and have it turned off
 - Add lib/modules folder with the transforms inside of it
 - Add the REST Kibana security based tags if needed and push those to any plugins using this plugin. Something like: tags: ['access:metricsEntities-read'] and ['access:metricsEntities-all'],
 - Add schema validation choosing some schema library (io-ts or Kibana Schema or ... )
 - Add unit tests
 - Add e2e tests
 - Move ui code into this plugin from security solutions? (maybe?)
