# Managed asset override procedure

## Terms and definitions

- **asset**: An asset means an instance of a stateful Elasticsearch concept such as an index, index template, data stream, ingest pipeline.
- **managed asset**: A managed asset is an asset whose creation, update, and deletion is expected to be performed not by the user, but by a managing piece of code such as the ingest manager or a beat. Index templates are considered managed if the `managed` and `managed_by` properties of the `_meta` property are set. Data streams, indices and and ingest pipelines are considered managed if the corresponding index template is managed.
- **new indexing strategy**: The new indexing strategy is a naming convention for assets documented in https://github.com/elastic/kibana/blob/master/x-pack/plugins/ingest_manager/dev_docs/indexing_strategy.md.

## Goals

- Allow for changes/overrides of managed assets by non-owners
- Minimize race conditions while executing non-atomic operations
- Detect and avoid collision with other plugins that manage assets
- Follow the new indexing strategy
- Overrides can be parsed and modified for subsequent refinements

## Key points

- Managed assets are copied recursively to avoid data loss when the owner updates them.
- The `managed_by` property is updated to reflect the new owner of the copied assets.
- The new assets follow the new indexing strategy, with the exception that the ingest pipelines and index templates are made namespace-specific (by including the namespace in the asset name).
- The fact that copied assets of a managed asset are present can be detected via the naming scheme. Informing the user and handling potential additional actions are the responsibility of the original owner. For example, the ingest manager could detect and inform the user that there are overridden copies of a managed asset that will not be updated to avoid data loss.

## Overriding managed assets

The following describes the procedure of applying overrides in light of the constraints mentioned above. It is based on the "safe order of operations" documented in https://github.com/elastic/kibana/issues/59910.

### Creating initial overrides

Given

- a data stream `D` named `logs-myapp-default` (i.e. type `logs`, dataset `myapp`, namespace `default`)
- an ingest pipeline `P1` named `logs-myapp-1.0.0` (version `1.0.0`)
- an index template `T` named `logs-myapp` with...
  - `default_pipeline` set to `logs-myapp-1.0.0`
  - `index_patterns` set to `["logs-myapp-*]`
  - `priority` set to `200`
  - `meta.managed_by` set to `ingest-manager`
  - `composed_of` set to `["logs-myapp-mappings", "logs-myapp-settings"]` (might only be the case from 7.10 onward)
- a component template `CM` named `logs-myapp-mappings` with field mappings `M`
- a component template `CS` named `logs-myapp-settings` with index settings `S`
- an index `W` , which is the backing writing index of `D` and was created using `T`
- indices `I{1..N}`, which are the backing non-writing indices of `D`
- a sequence `[Pr1, Pr2, ...]` of new ingest pipeline processor configurations
- a set `MN` of new field mappings, which...
  - do not conflict with the mappings already present in `T`, `W`, and `I{1..N}`
  - match the fields added by the new ingest pipeline processors
- a set `SN` of new index settings
- no existing override for this combination of type, dataset, and namespace

the changes could be applied as follows:

1. Create a copy `P1'` of pipeline `P1` named `logs-myapp-default-1.0.0` (`${type}-${dataset}-${namespace}-${version}`)
1. Create a pipeline `P'` named `logs-myapp-default-1.0.0-local-1` (`${type}-${dataset}-${namespace}-${version}-local-${overrideVersion}`), which...
   - includes a pipeline processor `Pr0` referring to `P1'` tagged as `original` as the first step
   - includes the additional processors `[Pr1, Pr2, ...]` required to perform the refinement as the subsequent steps
1. Create a copy `CM'` of component template `CM` named `logs-myapp-default-mappings` (`${type}-${dataset}-${namespace}-mappings`) with
   - field mappings `M'` composed of `M` and `MN`
1. Create a copy `CS'` of component template `CS` named `logs-myapp-default-settings` (`${type}-${dataset}-${namespace}-settings`) with
   - index settings `S'` composed of `S` and `SN`
1. Create a copy `T'` of template `T` named `logs-myapp-default` (`${type}-${dataset}-${namespace}`) with...
   - `default_pipeline` set to `logs-myapp-default-1.0.0-local-1`
   - `index_patterns` set to `["logs-myapp-default"]` (`${type}-${dataset}-${namespace}`)
   - `priority` set to `300`
   - `meta.managed_by` set to `log-structure-helper`
   - `composed_of` set to `["logs-myapp-default-mappings", "logs-myapp-default-settings"]`
1. Update the mappings and settings of `W` and `I{1..N}` to add the new field mappings `MN` and index settings `SN`

Errors could be handled as follows:

- Errors occurring in steps 1 to 5 cause the procedure to fail and the newly created override assets to be deleted.
- A mapping conflict in step 6 could cause a data stream rollover instead.

```
Original Managed Assets                 Overridden Managed Assets


+------------+                          +--------------------+
| template T |                          | template T'        |
| logs-myapp |                          | logs-myapp-default |
++-----------+                          ++-------------------+
 |                                       |
 | has default_pipeline                  | has default_pipeline
 |                                       |
 |  +------------------+                 |  +----------------------------------+
 +--> pipeline P1      |                 +--> pipeline P'                      |
 |  | logs-myapp-1.0.0 |                 |  | logs-myapp-default-1.0.0-local-1 |
 |  +------------------+                 |  ++---------------------------------+
 |                                       |   |
 | is composed_of                        |   | contains processors
 |                                       |   |
 |  +-----------------------+            |   |  +--------------------------+    +--------------------------+
 +--> component template CM |            |   +--> pipeline processor Pr0   +----> pipeline P1'             |
 |  | logs-myapp-mappings   |            |      +--------------------------+    | logs-myapp-default-1.0.0 |
 |  +-----------------------+            |      | Refinement processor Pr1 |    +--------------------------+
 |  +-----------------------+    =>      |      +--------------------------+
 +--> component template CS |            |      | Refinement processor Pr2 |
 |  | logs-myapp-settings   |            |      +--------------------------+
 |  +-----------------------+            |      | ...                      |
 |                                       |      +--------------------------+
 | is used by                            |
 |                                       | is composed_of
 |  +--------------------+               |
 +--> data stream D      |               |  +-----------------------------+
    | logs-myapp-default |               +--> component template CM'      |
    ++-------------------+               |  | logs-myapp-default-mappings |
     |                                   |  +-----------------------------+
     | is backed by                      |  +-----------------------------+
     |                                   +--> component template CS'      |
     |  +---------+                      |  | logs-myapp-default-settings |
     +--> index W |                      |  +-----------------------------+
     |  +---------+                      |
     |  +----------+                     | is used by
     +--> index I1 |                     |
     |  +----------+                     |  +--------------------+
     |  +----------+                     +--> data stream D      |
     +--> index I2 |                        | logs-myapp-default |
        +----------+                        ++-------------------+
                                             |
                                             | is backed by
                                             |
                                             |  +---------+
                                             +--> index W |
                                             |  +---------+
                                             |  +----------+
                                             +--> index I1 |
                                             |  +----------+
                                             |  +----------+
                                             +--> index I2 |
                                                +----------+
```

### Subsequently changing overrides

Given the same situation as in "Creating initial overrides", but also

- a previously created override pipeline `P'` named `logs-myapp-default-1.0.0-local-1`, with...
   - a `pipeline` processor `Pr0` referring to `P1'` tagged as `original` as the first step
   - additional processors `[Pr1, Pr2, ...]` as the subsequent steps
- a previously created override component template `CM'` named `logs-myapp-default-mappings` with field mappings `M'`
- a previously created override component template `CS'` named `logs-myapp-default-settings` with index settings `S'`
- a previously created override index template `T'` with...
   - `default_pipeline` set to `logs-myapp-default-1.0.0-local-1`
   - `index_patterns` set to `["logs-myapp-default"]` (`${type}-${dataset}-${namespace}`)
   - `priority` set to `300`
   - `meta.managed_by` set to `log-structure-helper`
   - `composed_of` set to `["logs-myapp-default-mappings", "logs-myapp-default-settings"]`
- an index `W` , which is the backing writing index of `D`
- indices `I{1..N}`, which are the backing non-writing indices of `D`
- a sequence `[Pr1', Pr2', ...]` of updated ingest pipeline processor configurations derived from `[Pr1, Pr2, ...]`
- a set `MN'` of new field mappings, which...
  - do not conflict with the mappings already present in `T'`, `W`, and `I{1..N}`
  - match the fields added by the new ingest pipeline processors
- a set `SN'` of new index settings

the overrides could be changed as follows:

1. Create a copy `P''` of pipeline `P'` named `logs-myapp-default-1.0.0-local-2` (`${type}-${dataset}-${namespace}-${version}-local-${overrideVersion}`), which...
   - includes a pipeline processor `Pr0` referring to `P1'` tagged as `original` as the first step
   - includes the additional processors `[Pr1', Pr2', ...]` required to perform the refinement as the subsequent steps
1. Update component template `CM'` to contain field mappings `M''` composed of `M'` and `MN'`
1. Update component template `CS'` to contain index settings `S''` composed of `S'` and `SN'`
1. Update index template `T'` with
   - `default_pipeline` set to `logs-myapp-default-1.0.0-local-2`
1. Update the mappings and settings of `W` and `I{1..N}` to add the new field mappings `MN'` and index settings `SN'`

Errors could be handled as follows:

- Errors occurring in steps 1 to 4 cause the procedure to fail and the newly created override assets to be deleted.
- A mapping conflict in step 5 could cause a data stream rollover instead.
