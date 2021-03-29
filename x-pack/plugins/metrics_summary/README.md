# metrics_summary

Metrics summary where you can create metrics and summary transform jobs.

The transform jobs are on the file system as:
 - modules (The different logical pieces)
  
When you create a "group" of transforms you can create them using an optional namespace and you can give an optional "key" as well to separate them based on their queries.
---


## Scripts

TODO: Add a note about scripts, setup, and running

## Development

TODO: Add how to develop here

## TODO List
 - Fix bug with when two different modules refer to the same mapping. Probably need to do this:
        First remove the transforms from the module
        Then before removing a mapping do a search against all remaining templates and filter out any mappings that are there
        Once the filter is complete remove all dangling/un-tied mappings to the transforms.
        Users could have tied a mapping to a custom transform (for example) or other issues, so this bug should be fixed.
 - Change the REST routes on post to change the indexes for whichever indexes you want
 - Add an Auto start feature to the REST API for the posts
 - Unit tests to ensure the data of the mapping.json includes the correct fields such as
   _meta, at least one alias, a mapping section, etc... 
 - Add text/keyword and other things to the mappings (not just keyword)
 - Add dynamic version number during creation that has this info: "version" : { "created" : "8.0.0" },
 - Module (server/modules) templating with variables and then push those variables down 
 - Add bootstrapped indexes and templates and mappings for the cache
 - Add grouping
 - Add namespace
 - Add unit tests
 - Add feature flag and have it turned off
 - Add lib/modules folder with the transforms inside of it
 - Add the security type REST tags if needed and push those to any plugins using this plugin
 - Add small hash like uuid v5 (hopefully smaller but fine if we do) for keys 
 - Add client API like lists API has for other plugins to make use of
 - Add schema validation choosing some schema library (io-ts or Kibana Schema or ... )
 - Add e2e tests
 - Add a proper API library and any hooks into the UI sections (maybe?)
