TODO: move google doc here

This document is part of the original drafts for ingest management documentation in `docs/ingest_manager` and may be outdated.
Overall documentation of Ingest Management is now maintained in the `elastic/stack-docs` repository.

# Ingest Management Definitions

This section is to define terms used across ingest management.

## Package policy

A package policy is a definition on how to collect data from a service, for example `nginx`. A package policy contains
definitions for one or multiple inputs and each input can contain one or multiple streams.

With the example of the nginx Package policy, it contains two inputs: `logs` and `nginx/metrics`. Logs and metrics are collected
differently. The `logs` input contains two streams, `access` and `error`, the `nginx/metrics` input contains the stubstatus stream.

## Data stream

Data streams are a [new concept](https://github.com/elastic/elasticsearch/issues/53100) in Elasticsearch which simplify
ingesting data and the setup of Elasticsearch.

## Elastic Agent

A single, unified agent that users can deploy to hosts or containers. It controls which data is collected from the host or containers and where the data is sent. It will run Beats, Endpoint or other monitoring programs as needed. It can operate standalone or pull an agent policy from Fleet.

## Elastic Package Registry

The Elastic Package Registry (EPR) is a service which runs under [https://epr.elastic.co]. It serves the packages through its API.
More details about the registry can be found [here](https://github.com/elastic/package-registry).

## Fleet

Fleet is the part of the Ingest Manager UI in Kibana that handles the part of enrolling Elastic Agents, managing agents and sending policies to the Elastic Agent.

## Indexing Strategy

Ingest Management + Elastic Agent follow a strict new indexing strategy: `{type}-{dataset}-{namespace}`. An example
for this is `logs-nginx.access-default`. More details about it can be found in the Index Strategy below. All data of
the index strategy is sent to data streams.

## Input

An input is the configuration unit in an Agent policy that defines the options on how to collect data from
an endpoint. This could be username / password which are need to authenticate with a service or a host url
as an example.

An input is part of a Package policy and contains streams.

## Integration

An integration is a package with the type integration. An integration package has at least 1 package policy
and usually collects data from / about a service.

## Namespace

A user-specified string that will be used to part of the index name in Elasticsearch. It helps users identify logs coming from a specific environment (like prod or test), an application, or other identifiers.

## Package

A package contains all the assets for the Elastic Stack. A more detailed definition of a
package can be found under https://github.com/elastic/package-registry.

Besides the assets, a package contains the package policy definitions with its inputs and streams.

## Stream

A stream is a configuration unit in the Elastic Agent policy. A stream is part of an input and defines how the data
fetched by this input should be processed and which Data Stream to send it to.
