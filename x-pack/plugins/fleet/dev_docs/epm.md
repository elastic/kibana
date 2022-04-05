TODO: consolidate with docs issue that is open now

This document is part of the original drafts for ingest management documentation in `docs/ingest_manager` and may be outdated.
Overall documentation of Ingest Management is now maintained in the `elastic/stack-docs` repository.

# Package Upgrades

When upgrading a package between a bugfix or a minor version, no breaking changes should happen. Upgrading a package has the following effect:

- Removal of existing dashboards
- Installation of new dashboards
- Write new ingest pipelines with the version
- Write new Elasticsearch alias templates
- Trigger a rollover for all the affected indices

The new ingest pipeline is expected to still work with the data coming from older policies. In most cases this means some of the fields can be missing. For this to work, each event must contain the version of policy / package it is coming from to make such a decision.

In case of a breaking change in the data structure, the new ingest pipeline is also expected to deal with this change. In case there are breaking changes which cannot be dealt with in an ingest pipeline, a new package has to be created.

Each package lists its minimal required agent version. In case there are agents enrolled with an older version, the user is notified to upgrade these agents as otherwise the new policies cannot be rolled out.

# Generated assets

When a package is installed or upgraded, certain Kibana and Elasticsearch assets are generated from . These follow the naming conventions explained above (see "indexing strategy") and contain configuration for the Elastic stack that makes ingesting and displaying data work with as little user interaction as possible.

## Elasticsearch Index Templates

### Generation

- Index templates are generated from `YAML` files contained in the package.
- There is one index template per data stream.
- For the generation of an index template, all `yml` files contained in the package subdirectory `data_stream/DATASET_NAME/fields/` are used.
