/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinitionSchema, type EntityDefinition } from '@kbn/entities-schema';

export const HOST_ENTITY_DEFINITION: EntityDefinition = entityDefinitionSchema.parse({
  id: 'ea_host_entity_store',
  name: 'EA Host Store',
  type: 'node',
  indexPatterns: ['log*'],
  filter: '@timestamp >= now-5m',
  identityFields: ['host.name'],
  displayNameTemplate: '{{host.name}}',
  metadata: [
    'host.domain',
    'host.hostname',
    'host.id',
    'host.ip',
    'host.mac',
    'host.name',
    'host.type',
    'host.architecture',
    'asset.criticality',
  ],
  history: {
    timestampField: '@timestamp',
    interval: '1m',
  },
  version: '1.0.0',
});

export const USER_ENTITY_DEFINITION: EntityDefinition = entityDefinitionSchema.parse({
  id: 'ea_user_entity_store',
  name: 'EA User Store',
  type: 'node',
  indexPatterns: ['log*'],
  filter: '@timestamp >= now-5m',
  identityFields: ['user.name'],
  displayNameTemplate: '{{user.name}}',
  metadata: [
    'user.domain',
    'user.email',
    'user.full_name',
    'user.hash',
    'user.id',
    'user.name',
    'user.roles',
    'asset.criticality',
  ],
  history: {
    timestampField: '@timestamp',
    interval: '1m',
  },
  version: '1.0.0',
});

/*
https://github.com/elastic/security-team/issues/10102
https://github.com/elastic/security-team/issues/10230
https://github.com/elastic/security-team/issues/10148
https://docs.google.com/spreadsheets/d/1fBxKS-PcCFMY8LrpcMzw8-CsP4AwgSr8co3v4WB31bg/edit?gid=0#gid=0

[ ] An entity definition is installable within the Elastic Security Solution (with APIs available as a result of this issue)
Note that it is likely that one entity definition will need to be created for each entity type, namely host and user entities.


[x] Utilizes host.name and user.name for the unique identifier

[x] Captures the metadata fields determined as a result of this spike, 
[ ] ensuring that array fields are captured as arrays, and singular fields capture only the latest value

[ ] Incorporates the index patterns found in the security default data view as a set of data sources

[ ] Incorporates the latest risk score and latest asset criticality as data sources for entity attribute maintenance
A note on asset criticality: due to the fact that this internal index is not currently ECS compliant, we will have to include a filter that ensures the id_field is only for the appropriate entity type, such as host or user. This issue will alleviate that need in the future.

[ ] Utilizes the @timestamp field // For what?

[x] Defines a history and latest transform that run once per minute



'{
  "id": "TODO___host_entity-store",
  "name": "EA Host Store",
  "type": "node",
  "indexPatterns": [...DEFAULT_INDEX_PATTERN],
  "filter": "@timestamp >= now-5m",
  "lookback": "5m",
  "identityFields": [
    "host.name",
  ],
  "displayNameTemplate": "{{host.name}}",
  "metadata": [
    "host.architecture",
    "host.domain",
    "host.hostname",
    "host.id",
    "host.ip",
    "host.mac",
    "host.name",
    "host.type",
  ],
  "history": {
    "timestampField": "@timestamp",
    "interval": "1m",
  },
  "version": "1.0.0",
}'



// CREATE
 curl -H 'Content-Type: application/json' \
      -d '{"id":"ea_user_entity_store","name":"EA User Store","type":"node","indexPatterns":["log*"],"filter":"@timestamp >= now-5m","identityFields":["user.name"],"displayNameTemplate":"{{user.name}}","metadata":["user.domain","user.email","user.full_name","user.hash","user.id","user.name","user.roles"],"history":{"timestampField":"@timestamp","interval":"1m"},"version":"1.0.0"}' \
      -X POST \
      -H 'kbn-xsrf: true' \
        -H 'elastic-api-version: 1' \
      http:///elastic:changeme@localhost:5601/internal/entities/definition


// DELETE
curl -H 'Content-Type: application/json' \
      -X DELETE \
      -H 'kbn-xsrf: true' \
        -H 'elastic-api-version: 1' \
      http:///elastic:changeme@localhost:5601/internal/entities/definition/todo_host_entity-store

// GET
curl -H 'Content-Type: application/json' \
      -X GET \
      -H 'kbn-xsrf: true' \
        -H 'elastic-api-version: 1' \
      http:///elastic:changeme@localhost:5601/internal/entities/definition



*/

// Blockers
// We can't access the entity manager plugin from the server side - @kevin Lacambane said he'd look into it https://elastic.slack.com/archives/C043Q05P12B/p1724839105633859
// We cannot access the latest values only - https://elastic.slack.com/archives/C043Q05P12B/p1724754728872679
