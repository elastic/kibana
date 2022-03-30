# Data Streams

Packages use [data streams](https://www.elastic.co/guide/en/elasticsearch/reference/current/data-streams.html) to ingest data into elasticsearch. These data streams follow the [data stream naming format](https://www.elastic.co/blog/an-introduction-to-the-elastic-data-stream-naming-scheme). Data streams are defined in the package and constructed by Fleet during package install. Mappings are generally derived from `/data_Stream/<my_stream>/fields/*.yml` in the package, there is also the ability for packages to set custom mappings or settings directly, e.g APM sets dynamic mapping [here](https://github.com/elastic/package-storage/blob/production/packages/apm/0.4.0/data_stream/app_metrics/manifest.yml#L8) 


## Template Structure

### Index Template 
The index template is designed to be as empty as possible, with settings, mappings etc being applied in component templates. Only applying settings and mappings in component templates means we can:
- create more granular index templates in the future (e.g namespace specific) that can use the same component templates (keeping one source of truth)
- allow users to override any setting by using the component template hierarchy (index template settings and mappings cannot be overridden by a component template)

### Component Templates (as of 8.2)
In order of priority from highest to lowest:
  - `.fleet_agent_id_verification-1` - added when agent id verification is enabled, sets the `.fleet_final_pipeline-1` and agent ID mappings. ([we plan to remove the ability to disable agent ID verification](https://github.com/elastic/kibana/issues/127041) )
  - `.fleet_globals-1` - contains fleet global settings and mappings, applied to every data stream
  - `@custom` component template - empty, available as an escape hatch for user to apply custom settings
  - `@package` component template - fleet default settings and mappings plus any settings and mappings defined by the integration.

### `_meta` Fields

All component and index templates have [_meta](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-meta-field.html) fields defined. This allows us to mark them up with:

- package name - the package associated with the data stream
- managed - not editable by the user 
- managed by - managed by the fleet plugin 

example:
```JSON
      "_meta" : {
        "package" : {
          "name" : "system"
        },
        "managed_by" : "fleet",
        "managed" : true
      },
```

## Making Changes to Template Structure

When making changes to the template structure (e.g [#124013](https://github.com/elastic/kibana/pull/124013)), this will need to be applied to all installed packages on upgrade to retain consistency. On startup we have [a check](https://github.com/elastic/kibana/blob/a52ba7cefe1a04ef6eafa32d5e410a3a901169b2/x-pack/plugins/fleet/server/services/setup.ts#L151) to see if any of the global assets have changed. If they have changed then we attempt to reinstall every package. This will in most cases cause a rollover of all datastreams so shouldn't be treated lightly.


## Pre 8.2 Template Structure

Pre 8.2 the template structure was as follows (in order of precedence): 
  -  index template - All package mappings (moved to @package component template), plus fleet default dynamic mappings (moved to .fleet_globals-1)
  - `.fleet_component_template-1` -  set agent ID verification if enabled (now moved to `.fleet_agent_id_verification-1`)
  - `@custom` component template - empty, available for user to apply custom settings
  - `@settings` component template - any custom settings specified by the integration
  - `@mappings` component template - any custom settings specified by the integration