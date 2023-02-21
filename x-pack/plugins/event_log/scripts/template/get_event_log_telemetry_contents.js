#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { SchemaHeaderTemplate } = require('./schema_header_template');
const { EventLogTelemetryFileTemplate } = require('./event_log_telemetry_template');

function getEventLogTelemetryContents(formattedLines) {
  const schemaTemplate = `${SchemaHeaderTemplate}${EventLogTelemetryFileTemplate}`;
  return Object.keys(formattedLines).reduce((currTemplate, key) => {
    return currTemplate.replace(`%%${key}%%`, formattedLines[key]);
  }, schemaTemplate);
}

module.exports = {
  getEventLogTelemetryContents,
};
