# Evaluation Framework

## Overview

This tool is developed for the teams working on anything related to inference. It simplifies scripting and evaluating various scenarios with the Large Language Model (LLM) integration.

## Setup requirements

- An Elasticsearch instance
- A Kibana instance
- At least one generative AI connector set up

## Running evaluations

Run the tool using:

`$ node x-pack/plugins/inference/scripts/evaluation/index.js`

This will evaluate all existing scenarios, and write the evaluation results to the terminal.

### Configuration

#### Kibana and Elasticsearch

By default, the tool will look for a Kibana instance running locally (at `http://localhost:5601`, which is the default address for running Kibana in development mode). It will also attempt to read the Kibana config file for the Elasticsearch address & credentials. If you want to override these settings, use `--kibana` and `--es`. Only basic auth is supported, e.g. `--kibana http://username:password@localhost:5601`. If you want to use a specific space, use `--spaceId`

#### Connector

Use `--connectorId` to specify a generative AI connector to use. If none are given, it will prompt you to select a connector based on the ones that are available. If only a single supported connector is found, it will be used without prompting.

Use `--evaluateWith` to specify the gen AI connector to use for evaluating the output of the task. By default, the same connector will be used.