#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const fs = require('fs');
const path = require('path');
const lodash = require('lodash');

const LineWriter = require('./lib/line_writer');
const mappings = require('./mappings');

const PLUGIN_DIR = path.resolve(path.join(__dirname, '..'));
const ECS_MAPPINGS_FILE = 'generated/elasticsearch/7/template.json';
const EVENT_LOG_MAPPINGS_FILE = 'generated/mappings.json';
const EVENT_LOG_CONFIG_SCHEMA_FILE = 'generated/schemas.ts';

function main() {
  const ecsDir = getEcsDir();
  const ecsVersion = getEcsVersion(ecsDir);

  const ecsMappings = readEcsJSONFile(ecsDir, ECS_MAPPINGS_FILE);

  // add our custom fields
  ecsMappings.mappings.properties.kibana = mappings.EcsKibanaExtensionsMappings;

  const exportedProperties = mappings.EcsEventLogProperties;
  const multiValuedProperties = new Set(mappings.EcsEventLogMultiValuedProperties);

  const elMappings = getEventLogMappings(ecsMappings, exportedProperties);

  console.log(`generating files in ${PLUGIN_DIR}`);
  writeEventLogMappings(elMappings);
  writeEventLogConfigSchema(elMappings, ecsVersion, multiValuedProperties);
}

// return a stripped down version of the ecs schema, with only exportedProperties
function getEventLogMappings(ecsSchema, exportedProperties) {
  const result = {
    mappings: {
      properties: {
      }
    }
  };

  // get full list of properties to copy
  const leafProperties = exportedProperties.map(replaceDotWithProperties);

  // copy the leaf values of the properties
  for (const prop of leafProperties) {
    const value = lodash.get(ecsSchema.mappings.properties, prop);
    lodash.set(result.mappings.properties, prop, value);
  }

  // set the non-leaf values as appropriate
  const nonLeafProperties = getNonLeafProperties(exportedProperties).map(replaceDotWithProperties);
  for (const prop of nonLeafProperties) {
    const ecsValue = lodash.get(ecsSchema.mappings.properties, prop);
    const elValue = lodash.get(result.mappings.properties, prop);

    elValue.type = ecsValue.type;
    elValue.dynamic = 'strict';
  }

  return result;
}

// eg, 'ecs.version' -> 'ecs.properties.version'
function replaceDotWithProperties(s) {
  return s.replace(/\./g, '.properties.');
}

// given an array of property names, return array of object/nested ones
function getNonLeafProperties(propertyNames) {
  const result = new Set();

  for (const propertyName of propertyNames) {
    const parts = propertyName.split(/\./g);
    if (parts.length <= 1) continue;
    parts.pop();
    result.add(parts.join('.'));
  }

  return Array.from(result);
}

function writeEventLogMappings(elSchema) {
  // fixObjectTypes(elSchema.mappings);

  const mappings = {
    dynamic: 'strict',
    properties: elSchema.mappings.properties
  };

  writeGeneratedFile(EVENT_LOG_MAPPINGS_FILE, JSON.stringify(mappings, null, 4));
  console.log('generated:', EVENT_LOG_MAPPINGS_FILE);
}

function writeEventLogConfigSchema(elSchema, ecsVersion, multiValuedProperties) {
  const lineWriter = LineWriter.createLineWriter();

  const elSchemaMappings = augmentMappings(elSchema.mappings, multiValuedProperties);
  generateSchemaLines(lineWriter, null, elSchemaMappings);
  // last line will have an extraneous comma
  const schemaLines = lineWriter.getContent().replace(/,$/, '');

  const contents = getSchemaFileContents(ecsVersion, schemaLines);
  const schemaCode = `${contents}\n`;

  writeGeneratedFile(EVENT_LOG_CONFIG_SCHEMA_FILE, schemaCode);
  console.log('generated:', EVENT_LOG_CONFIG_SCHEMA_FILE);
}

const StringTypes = new Set(['string', 'keyword', 'text', 'ip']);
const NumberTypes = new Set(['long', 'integer', 'float']);

function augmentMappings(mappings, multiValuedProperties) {
  // clone the mappings, as we're adding some additional properties
  mappings = JSON.parse(JSON.stringify(mappings));

  for (const prop of multiValuedProperties) {
    const fullProp = replaceDotWithProperties(prop);
    lodash.set(mappings.properties, `${fullProp}.multiValued`, true);
  }

  return mappings;
}

function generateSchemaLines(lineWriter, prop, mappings) {
  const propKey = legalPropertyName(prop);

  if (StringTypes.has(mappings.type)) {
    if (mappings.multiValued) {
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

  if (mappings.type === 'date') {
    lineWriter.addLine(`${propKey}: ecsDate(),`);
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

function readEcsJSONFile(ecsDir, fileName) {
  const contents = readEcsFile(ecsDir, fileName);

  let object;
  try {
    object = JSON.parse(contents);
  } catch (err) {
    logError(`ecs file is not JSON: ${fileName}: ${err.message}`);
  }

  return object;
}

function writeGeneratedFile(fileName, contents) {
  const genFileName = path.join(PLUGIN_DIR, fileName);
  try {
    fs.writeFileSync(genFileName, contents);
  } catch (err) {
    logError(`error writing file: ${genFileName}: ${err.message}`);
  }
}

function readEcsFile(ecsDir, fileName) {
  const ecsFile = path.resolve(path.join(ecsDir, fileName));

  let contents;
  try {
    contents = fs.readFileSync(ecsFile, { encoding: 'utf8' });
  } catch (err) {
    logError(`ecs file not found: ${ecsFile}: ${err.message}`);
  }

  return contents;
}

function getEcsVersion(ecsDir) {
  const contents = readEcsFile(ecsDir, 'version').trim();
  if (!contents.match(/^\d+\.\d+\.\d+$/)) {
    logError(`ecs is not at a stable version: : ${contents}`);
  }

  return contents;
}

function getEcsDir() {
  const ecsDir = path.resolve(path.join(__dirname, '../../../../../ecs'));

  let stats;
  let error;
  try {
    stats = fs.statSync(ecsDir);
  } catch (err) {
    error = err;
  }

  if (error || !stats.isDirectory()) {
    logError(`directory not found: ${ecsDir} - did you checkout elastic/ecs as a peer of this repo?`);
  }

  return ecsDir;
}

function logError(message) {
  console.log(`error: ${message}`);
  process.exit(1);
}

const SchemaFileTemplate = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// ---------------------------------- WARNING ----------------------------------
// this file was generated, and should not be edited by hand
// ---------------------------------- WARNING ----------------------------------

// provides TypeScript and config-schema interfaces for ECS for use with
// the event log

import { schema, TypeOf } from '@kbn/config-schema';

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U> ? Array<DeepPartial<U>> : DeepPartial<T[P]>;
};

export const ECS_VERSION = '%%ECS_VERSION%%';

// types and config-schema describing the es structures
export type IValidatedEvent = TypeOf<typeof EventSchema>;
export type IEvent = DeepPartial<DeepWriteable<IValidatedEvent>>;

export const EventSchema = %%SCHEMA%%;

function ecsStringMulti() {
  return schema.maybe(schema.arrayOf(schema.string()));
}

function ecsString() {
  return schema.maybe(schema.string());
}

function ecsNumber() {
  return schema.maybe(schema.number());
}

function ecsDate() {
  return schema.maybe(schema.string({ validate: validateDate }));
}

const ISO_DATE_PATTERN = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/;

function validateDate(isoDate: string) {
  if (ISO_DATE_PATTERN.test(isoDate)) return;
  return 'string is not a valid ISO date: ' + isoDate;
}
`.trim();

function getSchemaFileContents(ecsVersion, schemaLines) { // interfaceLines) {
  return SchemaFileTemplate
    .replace('%%ECS_VERSION%%', ecsVersion)
    .replace('%%SCHEMA%%', schemaLines);
  // .replace('%%INTERFACE%%', interfaceLines);
}

// run as a command-line script
if (require.main === module) main();
