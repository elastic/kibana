#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const LineWriter = require('./line_writer');
const { getEventLogSchemaContents } = require('../template/get_event_log_schema_contents');
const { writeGeneratedFile } = require('./write_generated_file');
const { logError } = require('./log_error');

const EVENT_LOG_CONFIG_SCHEMA_FILE = '../generated/schemas.ts';

module.exports = {
  writeEventLogConfigSchema,
};

function writeEventLogConfigSchema(elSchema, ecsVersion) {
  const lineWriter = LineWriter.createLineWriter();

  generateSchemaLines(lineWriter, null, elSchema.mappings);
  // last line will have an extraneous comma
  const schemaLines = lineWriter.getContent().replace(/,$/, '');

  const contents = getEventLogSchemaContents(ecsVersion, schemaLines);
  const schemaCode = `${contents}\n`;

  writeGeneratedFile(EVENT_LOG_CONFIG_SCHEMA_FILE, schemaCode);
  console.log('generated:', EVENT_LOG_CONFIG_SCHEMA_FILE);
}

const StringTypes = new Set(['string', 'keyword', 'text', 'ip']);
const NumberTypes = new Set(['integer', 'float']);
const StringOrNumberTypes = new Set(['long']);

function generateSchemaLines(lineWriter, prop, mappings) {
  const propKey = legalPropertyName(prop);
  if (mappings == null) return;

  if (StringTypes.has(mappings.type)) {
    if (mappings.meta && mappings.meta.isArray === 'true') {
      lineWriter.addLine(`${propKey}: ecsStringMulti(),`);
    } else {
      lineWriter.addLine(`${propKey}: ecsString(),`);
    }
    return;
  }

  if (NumberTypes.has(mappings.type)) {
    lineWriter.addLine(`${propKey}: ecsNumber(),`);
    return;
  }

  if (StringOrNumberTypes.has(mappings.type)) {
    lineWriter.addLine(`${propKey}: ecsStringOrNumber(),`);
    return;
  }

  if (mappings.type === 'date') {
    lineWriter.addLine(`${propKey}: ecsDate(),`);
    return;
  }

  if (mappings.type === 'version') {
    lineWriter.addLine(`${propKey}: ecsVersion(),`);
    return;
  }

  if (mappings.type === 'boolean') {
    lineWriter.addLine(`${propKey}: ecsBoolean(),`);
    return;
  }

  // only handling objects for the rest of this function
  if (mappings.properties == null) {
    logError(`unknown properties to map: ${prop}: ${JSON.stringify(mappings)}`);
  }

  // top-level object does not have a property name
  if (prop == null) {
    lineWriter.addLine(`schema.maybe(`);
    lineWriter.indent();
    lineWriter.addLine(`schema.object({`);
  } else {
    lineWriter.addLine(`${propKey}: schema.maybe(`);
    lineWriter.indent();
    if (mappings.type === 'nested') {
      lineWriter.addLine(`schema.arrayOf(`);
      lineWriter.indent();
    }
    lineWriter.addLine(`schema.object({`);
  }

  // write the object properties
  lineWriter.indent();
  for (const prop of Object.keys(mappings.properties)) {
    if (prop === 'meta') continue;
    generateSchemaLines(lineWriter, prop, mappings.properties[prop]);
  }
  lineWriter.dedent();

  lineWriter.addLine('})');
  if (mappings.type === 'nested') {
    lineWriter.dedent();
    lineWriter.addLine(')');
  }

  lineWriter.dedent();
  lineWriter.addLine('),');
}

function legalPropertyName(prop) {
  if (prop === '@timestamp') return `'@timestamp'`;
  return prop;
}
