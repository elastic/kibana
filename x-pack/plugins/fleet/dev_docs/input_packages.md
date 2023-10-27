# Input Packages

Github issue: https://github.com/elastic/kibana/issues/133296

Design Document: https://docs.google.com/document/d/1vzBh2frnlxEBBcab8-ist8pu_PDZUjOHdsV-QuUn_WA/edit

## Background 

To enable the collection, transformation, and analysis of data flowing between elasticsearch and an external data source like 1Password or Apache HTTP server, a user needs a bunch of components including agent configuration, inputs, ingest pipelines, data streams, index templates, visualizations, etc. When these assets and their definitions are encapsulated together, we call it a package. 

Until input packages, there used to be only one type of package - "integration". An input-only package (input package) is composed of only an input and agent configuration. These packages leave all other assets for users to define and are very generic intentionally.

An example of an input package is the `logs` package.

## Dataset customization 

Currently, the dataset is the only way that a user can customize an input only integration, the user can specify a new or existing dataset and the data will be sent there. 

To allow this customization, kibana only creates the index and component templates at package policy creation time (as opposed to at package install time as with integration packages). Related code [here](https://github.com/hop-dev/kibana/blob/08d44fe52b3900c80242d2446feef7b7a7f9e2af/x-pack/plugins/fleet/server/services/epm/packages/_install_package.ts#L219)

The index templates etc are only created if the user selected to send to a datastream which doesn't currently exist. 

### UI dataset selector

The dataset selector in the UI shows the user all available datasets to send to, or gives the option to send to a new datastream. 

To get all available datastream we use the datastreams API which returns all fleet managed datastreams. Fleet managed is detected using the datastream metadata, this is why all a users datastreams will not show in this selector. 

## Package structure 

An input-only package expects the following structure:
```
├── agent/input
│   └── input.yml.hbs
├── changelog.yml
├── docs
│   └── README.md
├── fields
│   └── input.yml
├── img
│   └── input-logo.svg
└── manifest.yml
```
1. File manifest.yml describes the properties of the package, similarly to the Integration type, including a policy template, and all Beats input options.
    - type: input
    - File input.yml contains definitions of fields set by the input, generic ones, and unrelated to the processed data.

2. File input.yml.hbs is a template used to build the agent’s policy.
    - It needs to include if-conditions for all Beats input options.
    - It will accept a special configuration for extra Beats processors. For example: to strip some fields on the agent level before passing to the ingest pipeline.
3. Files changelog.yml, docs/*, img/* are the same as for integration-type packages.

## FAQ

### Are input packages finished? 

No! Dataset is currently the only thing that we allow to be customized, but we could also have UIs for:

 - An ingest pipeline - a user could select one or many ingestion pipelines from the ingest pipelines available in the cluster.
 - Custom field mapping - a user could provide their own field mapping and they would be added to the index template on creation

 This was intended for a 'phase 3' of input packages which we never got to.


### Why don't input packages allow assets e.g dashboards to be defined? 

Because input packages allow dataset to be configured, the data could end up anywhere. Therefore assets e.g a dashboard would not know where to point to fetch their data. This isn;t an impossible problem to solve but this is the reason input packages don't currently allow assets.
