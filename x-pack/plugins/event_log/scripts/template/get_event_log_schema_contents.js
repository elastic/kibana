#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { SchemaHeaderTemplate } = require('./schema_header_template');
const { EventLogSchemaFileTemplate } = require('./event_log_schema_template');

function getEventLogSchemaContents(ecsVersion, schemaLines) {
  const schemaTemplate = `${SchemaHeaderTemplate}${EventLogSchemaFileTemplate}`;
  return schemaTemplate.replace('%%ECS_VERSION%%', ecsVersion).replace('%%SCHEMA%%', schemaLines);
}

module.exports = {
  getEventLogSchemaContents,
};
