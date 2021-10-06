# metrics_entities

This is the metrics and entities plugin where you add can add transforms for your project
and group those transforms into modules. You can also re-use existing transforms in your
newly created modules as well.

## Turn on experimental flags
During at least phase 1 of this development, please add these to your `kibana.dev.yml` file to turn on the feature:

```ts
xpack.metricsEntities.enabled: true
xpack.securitySolution.enableExperimental: ['metricsEntitiesEnabled']
```

## Quick start on using scripts to call the API

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
```

source `$HOME/.zshrc` or `${HOME}.bashrc` to ensure variables are set:

```sh
source ~/.zshrc
```

Restart Kibana and ensure that you are using `--no-base-path` as changing the base path is a feature but will
get in the way of the CURL scripts written as is.

Go to the scripts folder `cd kibana/x-pack/plugins/metrics_entities/server/scripts` and can run some of the scripts
such as:

```sh
./post_transforms.sh ./post_examples/all.json
```

which will post transforms from the `all.json`

You can also delete them by running:

```sh
./delete_transforms.sh ./delete_examples/all.json
```

See the folder for other curl scripts that exercise parts of the REST API and feel free to add your own examples 
in the folder as well.

## Quick start on how to add a transform

You will want to figure out how you want your transform from within Kibana roughly using
the UI and then copy the JSON. The JSON you will want to change and paste within a folder
which represents a module.

For example, for the `host_entities` and a `host_entities_mapping` we created a folder called host_entities
here:

```sh
sever/modules/host_entities
```

Then we add two files, a subset of the transform JSON and a mapping like so:

```sh
server/modules/host_entities/host_entities_mapping.json <--- this is the mappings
server/modules/host_entities/host_entities.json <--- This is a subset of the transform JSON
index.ts <--- Import/export your json here 
```

The mappings can be normal mapping like so with `host_entities_mapping.json`:
```json
{
  "mappings": {
    "_meta": {
      "index": "host_ent"
    },
    "dynamic": "strict",
    "properties": {
      "@timestamp": {
        "type": "date"
      },
      "metrics": {
        "properties": {
          "host": {
            "properties": {
              "name": {
                "properties": {
                  "value_count": {
                    "type": "long"
                  }
                }
              }
            }
          }
        }
      },
      "host": {
        "properties": {
          "name": {
            "type": "keyword"
          },
          "os": {
            "properties": {
              "name": {
                "type": "keyword"
              },
              "version": {
                "type": "keyword"
              }
            }
          }
        }
      }
    }
  }
}
```

One caveat is that you need to add this to the meta section to tell it what the name will be:
```json
    "_meta": {
      "index": "host_ent"
    },
```

Keep the name short as there is only 65 characters for a transform job and we prepend extra information to the mapping such as:
* prefix
* name of estc

Although not required, a `"dynamic": "strict"` is strongly encouraged to prevent mapping guesses from elastic and it will be better for us
to spot errors quicker in the mappings such as type-o's if this is set to strict.

Next, for the transform, you should add a subset that doesn't have any additional settings or meta associated like so for `host_entities.json`:

```json
{
  "id": "host_ent",
  "description": "[host.name entities] grouped by @timestamp, host.name, os.name, and os.version, and aggregated on host.name",
  "pivot": {
    "group_by": {
      "@timestamp": {
        "date_histogram": {
          "field": "@timestamp",
          "calendar_interval": "1h"
        }
      },
      "host.name": {
        "terms": {
          "field": "host.name"
        }
      },
      "host.os.name": {
        "terms": {
          "field": "host.os.name",
          "missing_bucket": true
        }
      },
      "host.os.version": {
        "terms": {
          "field": "host.os.version",
          "missing_bucket": true
        }
      }
    },
    "aggregations": {
      "metrics.host.name.value_count": {
        "value_count": {
          "field": "host.name"
        }
      }
    }
  }
}
```

Look in the `server/modules` for other examples, but it should be that clear cut. The final part is to wire everything up in the code by touching a few files
to either add this to an existing module or create your own module. In `server/module/host_entities` we add an `index.ts` like so that does an import/export 
of the JSON:

```sh
import hostEntities from './host_entities.json';
import hostEntitiesMapping from './host_entities_mapping.json';
export { hostEntities, hostEntitiesMapping };
```

Then in `modules/index.ts` we add a new module name if we are creating a new module to the `export enum ModuleNames {` like so:

```ts
// Import your host entities you just made
import { hostEntities, hostEntitiesMapping } from './host_entities';

/**
 * These module names will map 1 to 1 to the REST interface.
 */
export enum ModuleNames {
  hostSummaryMetrics = 'host_metrics',  
  hostSummaryEntities = 'host_entities', // <-- Add the entities/transform and give it a enum name and a module name 
  networkSummaryEntities = 'network_entities',
  networkSummaryMetrics = 'network_metrics',
  userSummaryEntities = 'user_entities',
  userSummaryMetrics = 'user_metrics',
}
```

If you're not creating a new module but rather you are adding to an existing module, you can skip the above step. Next, you
just need to add your installable transform and installable mapping to the two data structures of `installableTransforms` and
`installableMappings` like so:

```ts
/**
 * Add any new folders as modules with their names below and grouped with
 * key values.
 */
export const installableTransforms: Record<ModuleNames, Transforms[]> = {
  [ModuleNames.hostSummaryMetrics]: [hostMetrics],
  [ModuleNames.hostSummaryEntities]: [hostEntities], // <-- Adds my new module name and transform to a new array.
  [ModuleNames.networkSummaryEntities]: [
    destinationIpEntities, // <-- If instead I am adding to an existing module, I just add it to the array like these show
    sourceIpEntities,
    destinationCountryIsoCodeEntities,
    sourceCountryIsoCodeEntities,
  ],
  [ModuleNames.networkSummaryMetrics]: [ipMetrics],
  [ModuleNames.userSummaryEntities]: [userEntities],
  [ModuleNames.userSummaryMetrics]: [userMetrics],
};

/**
 * For all the mapping types, add each with their names below and grouped with
 * key values.
 */
export const installableMappings: Record<ModuleNames, Mappings[]> = {
  [ModuleNames.hostSummaryMetrics]: [hostMetricsMapping],
  [ModuleNames.hostSummaryEntities]: [hostEntitiesMapping], // <-- Adds my new module name and mapping to a new array.
  [ModuleNames.networkSummaryEntities]: [ // <-- If instead I am adding to an existing module, I just add it to the array like these show
    sourceIpEntitiesMapping,
    destinationIpEntitiesMapping,
    destinationCountryIsoCodeEntitiesMapping,
    sourceCountryIsoCodeEntitiesMapping,
  ],
  [ModuleNames.networkSummaryMetrics]: [ipMetricsMapping],
  [ModuleNames.userSummaryEntities]: [userEntitiesMapping],
  [ModuleNames.userSummaryMetrics]: [userMetricsMapping],
};
```

And after that, you should check out if there are any existing e2e tests or unit tests to update here to ensure that your mapping and transform will
pass ci. Create a pull request and your mapping and transform are completed.

To call into the code to activate your module and create your transforms and mappings would be the following where you substitute your
${KIBANA_URL} with your kibana URL and the ${SPACE_URL} with any space id you have. If you're using the default space then you would use
an empty string: 
```json
POST ${KIBANA_URL}${SPACE_URL}/api/metrics_entities/transforms
{
  "prefix": "all",
  "modules": [
    "host_entities",
  ],
  "indices": [
    "auditbeat-*",
    "endgame-*",
    "filebeat-*",
    "logs-*",
    "packetbeat-*",
    "winlogbeat-*",
    "-*elastic-cloud-logs-*"
  ],
  "auto_start": true,
  "settings": {
    "max_page_search_size": 5000
  },
  "query": {
    "range": {
      "@timestamp": {
        "gte": "now-1d/d",
        "format": "strict_date_optional_time"
      }
    }
  }
}
```

Very similar to the regular transform REST API, with the caveats that you define which modules you want to install, the prefix name you want to use, and 
if you want to `auto_start` it or not. The rest such as `settings`, `query` will be the same as the transforms API. They will also push those same setting into
each of your transforms within your module(s) as the same setting for each individual ones.

## TODO List
During the phase 1, phase 2, phase N, this TODO will exist as a reminder and notes for what still needs to be developed. These are not in a priority order, but 
are notes during the phased approach. As we approach production and the feature flags are removed these TODO's should be removed in favor of Kibana issues or regular
left over TODO's in the code base.

- Add these properties to the route which are:
  - disable_transforms/exclude flag to exclude 1 or more transforms within a module
  - pipeline flag
  - Change the REST routes on post to change the indexes for whichever indexes you want
- Unit tests to ensure the data of the mapping.json includes the correct fields such as _meta, at least one alias, a mapping section, etc... 
- Add text/keyword and other things to the mappings (not just keyword maybe?) ... At least review the mappings one more time
- Add a sort of @timestamp to the output destination indexes?
- Add the REST Kibana security based tags if needed and push those to any plugins using this plugin. Something like: tags: ['access:metricsEntities-read'] and ['access:metricsEntities-all'],
- Add schema validation choosing some schema library (io-ts or Kibana Schema or ... )
- Add unit tests
- Add e2e tests
- Any UI code should not end up here. There is none right now, but all UI code should be within a kbn package or security_solutions
