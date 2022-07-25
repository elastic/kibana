# Overview of Integrations

Elastic Agent integrations are mechanisms for installing assets that provide an opinionated "out of the box" experience for ingesting data from various pieces of software, third party services, and even internal Elastic products. Fleet provides an interface for installing and managing these integrations. Integrations tell Elastic Agent where and how to retrieve data, and how it should be ingested into Elasticsearch.

In terms of what an integration actually _is_, it's a set of mostly YML files in a particular directory structure with particular naming conventions. These conventions are captured in a specification maintained by Elastic called the [package spec](https://github.com/elastic/package-spec/).

This document will detail some of the key files and fields defined by the package spec that we'll commonly deal with in Fleet, and will attempt to provide an informed mental model around integrations. We'll use Fleet's integration policy editor UI to show how integrations' configuration files are translated into the Fleet interface we present to users.

## References

- https://github.com/elastic/package-spec
- https://github.com/elastic/integrations/tree/main/packages

## Top level `manifest.yml`

🔗 [Package spec reference](https://github.com/elastic/package-spec/blob/main/versions/1/integration/manifest.spec.yml)

- Basic metadata for the integration like name, title, version, description, categories, etc
- Kibana compatibility spec
- Screenshots and icon assets

### `policy_templates`

🔗 [Package spec reference](https://github.com/elastic/package-spec/blob/main/versions/1/integration/manifest.spec.yml#L186-L273)

The top level `manifest.yml` file defines a set of `policy_templates` which define a grouping of fields used to configure the integration. These `policy_templates` control what’s rendered in Fleet UI’s “policy editor” when creating or editing integration policies.

Most integrations will only specify a single `policy_template` as they don’t require this level of structure. For integrations that export many “sub-integrations,” however, they rely on defining multiple templates.

For example, Nginx defines only a single `policy_template` - aptly named `nginx`:

```yml
# https://github.com/elastic/integrations/blob/main/packages/nginx/manifest.yml
policy_templates:
  - name: nginx
    title: Nginx logs and metrics
    description: Collect logs and metrics from Nginx instances
    inputs:
    # ...
```

This results in a policy editor UI that looks like this:

![Nginx policy editor screenshot](https://user-images.githubusercontent.com/6766512/171722222-b7e663d4-5668-4925-88df-ddabd9f590a5.png)

In contrast, the AWS integration defines many `policy_templates`, as it allows users to configure policy values for many distinct services like EC2, S3, or RDS. See the `policy_templates` definition for AWS [here](https://github.com/elastic/integrations/blob/main/packages/aws/manifest.yml#L77).

The AWS policy editor has a section for each provided `policy_template` value, e.g.

![AWS policy editor screenshot](https://user-images.githubusercontent.com/6766512/171722802-3f2705a1-71b6-4747-b5fb-c48ea069c597.png)

Each policy template is also exposed as its own distinct integration, and can be installed or managed separately as if it were a first-class integration:

![AWS integrations screenshot](https://user-images.githubusercontent.com/6766512/171723125-4d34a42c-de5b-4699-9683-99951d4f5bb1.png)

#### `inputs`

🔗 [Package spec reference](https://github.com/elastic/package-spec/blob/main/versions/1/integration/manifest.spec.yml#L221-L261)

Each `policy_template` entry defines a set of `inputs`. An `input` is essentially a named grouping of fields related to a particular type of data to be ingested.
Each `input` declares a `type` that typically maps to a Beats input like [httpjson](https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-input-httpjson.html) or [filestream](https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-input-filestream.html). Elastic Agent manages Beats under the hood,
so these `inputs` are how we can configure the individual Beats that Agent is managing.

For example, the Nginx integration defines three inputs:

1. `logfile`
2. `httpjson`
3. `nginx/metrics`

These inputs appear in the policy editor UI as separate fieldsets, e.g.

![Nginx inputs screenshot](https://user-images.githubusercontent.com/6766512/171724709-724bd7a1-bbcf-4c6a-bc36-f3aeac2c06f8.png)

Each input can define a list of `vars` that will allow a user to configure variables via form fields in the Fleet policy editor UI.

For example, on the Nginx integration's `httpjson` input, there are several "input level variables" configure, which are rendered as below:

![image](https://user-images.githubusercontent.com/6766512/171725972-351f3cd3-de86-49cf-81bc-6aa6dd4dec89.png)

These input level variables are defined in the Nginx integration [here](https://github.com/elastic/integrations/blob/main/packages/nginx/manifest.yml#L43).

It's important to note that integration also define variables at the data stream level, which we'll get into later in this doc. In the screenshot above, for example, the section beneath the "Settings" section of the `httpjson` input contains data stream variables for the streams configured as part of the `httpjson` input.

## `data_stream` directory

Each integration includes a `data_stream` directory that contains configuration for, well, [data streams](https://www.elastic.co/guide/en/elasticsearch/reference/current/data-streams.html).

Data streams are a construct in Elasticsearch designed for storing "append-only" time series data across multiple backing indices. They give Elastic Agent an easy and performant way to ingest logs and metrics data into Elasticsearch.

Inside of the `data_stream` directory, each data stream is defined as its own directory. For example, the Nginx integration's `data_stream` [directory](https://github.com/elastic/integrations/tree/main/packages/nginx/data_stream) contains three data streams:

1. `access`
2. `error`
3. `substatus`

Elastic Agent data streams conform to a [naming schema](https://www.elastic.co/blog/an-introduction-to-the-elastic-data-stream-naming-scheme) of `{type}-{dataset}-{namespace}`. The `type` of a data stream is either `logs` or `metrics`. The `dataset` of a datastream is controlled in most cases by an interpolation of the integration's `name` field and the directory name containing the data stream's `manifest.yml` file. The `namespace` value is provided by the user for the purpose of grouping or organizing data.

Each data stream directory contains a `manifest.yml` file that controls the configuration for the data stream, as well as Elasticsearch/Kibana assets, configuration for Agent, and more. Generally, though, the `manifest.yml` file is the most critical one in a given data stream directory.

In a data stream's `manifest.yml` file, the integration defines a list of `streams`. Each item in that `streams` list is tied to a single `input`, and defines its own list of `vars` that controls the set of form fields that appear in the policy editor UI.

For example, the Nginx integration's `access` data stream defines an entry in its `streams` list tied to the `logfile` input mentioned above that includes variables like `paths` and `tags`. The variables appear as form fields in the policy editor UI as below:

![Nginx data streams screenshot](https://user-images.githubusercontent.com/6766512/171729648-3936f0a8-2487-4862-8732-b0b93748274f.png)

The "Nginx access logs" fieldset we see in the policy editor UI is defined [here](https://github.com/elastic/integrations/blob/main/packages/nginx/data_stream/access/manifest.yml#L4-L40) in the `data_streams/access/manifest.yml` file within the Nginx integration. It's `input` value is set to `logfile`, so it appears under the "Collect logs from Nginx instances" section in the policy editor. The `title` and `description` values control what appears on the left-hand side to describe the fieldset.

### Data stream assets

Each data stream directory may contain an `elasticsearch` or `kibana` directory that contains assets (like ingest pipelines or Kibana dashboards) for a given
stack component. These assets are usually YML or JSON files that Fleet passes off to the corresponding stack component to install. For example, the Nginx integration's `data_stream/access` directory contains an `elasticsearch/ingest_pipeline` directory that contains the following files:

- `default.yml`
- `third-party.yml`

These files represent two ingest pipelines that ship with the Nginx integration to provide out-of-the-box mappings, field processing, etc for Nginx data.

For more information on data streams, see Fleet's dev docs [here](https://github.com/elastic/kibana/blob/main/x-pack/plugins/fleet/dev_docs/data_streams.md).

### `agent/stream` directory

Each data stream contains an `agent/stream` directory that includes YML files for configuring agent. These are template files that are compiled by Fleet when
generating the full agent policy.

_TODO: Document this in more detail_

### `fields` directory

The `fields` directory contains YML files that define the [mappings](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html) for a given data stream. There may be any number of `fields` files based on the integration maintainers preferred organization for their mappings. For example, many integrations
contain a `base-fields.yml` file for common mappings, an `ecs.yml` file for [ECS](https://www.elastic.co/guide/en/ecs/current/index.html)-compliant fields, an
`agent.yml` file for mappings specific to the actual agent process, and a `fields.yml` file for everything else.

The mappings defined by `fields` files are used by Fleet to generate an [index template](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-templates.html) for each data stream. This index template composes all of the mappings and settings and ensures that all documents ingested by
the data stream are indexed as configured.

## `docs` directory

Contains the README file rendered on the integrations detail page for the integration.

## `img` directory

Contains screenshots rendered on the integrations detail page for the integration.

## `kibana` directory

Contains top level Kibana assets (dashboards, visualizations, saved searches etc) for the integration.

## Relationship diagram

Reference the following diagram to understand the relationship between the various components of an integration:

```mermaid
erDiagram
  Integration ||--|{ PolicyTemplate : "Many policy templates"
  Integration ||--|{ DataStream : "Many data streams"

  PolicyTemplate ||--|{ Input : "Many inputs"

  DataStream ||--|{ Input : "Many inputs"

  Integration {}
  PolicyTemplate {}
  Input {}
  DataStream {}
```
