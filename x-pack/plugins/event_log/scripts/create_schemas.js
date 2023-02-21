#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const fs = require('fs');
const path = require('path');
const { set } = require('@kbn/safer-lodash-set');
const lodash = require('lodash');

const mappings = require('./mappings');
const { writeEventLogMappings } = require('./lib/write_event_log_mappings');
const { writeEventLogConfigSchema } = require('./lib/write_event_log_config_schema');
const { writeEventLogTelemetrySchema } = require('./lib/write_event_log_telemetry_schema');
const { logError } = require('./lib/utils');

const PLUGIN_DIR = path.resolve(path.join(__dirname, '..'));
const ECS_MAPPINGS_FILE = 'generated/elasticsearch/7/template.json';

function main() {
  const ecsDir = getEcsDir();
  const ecsVersion = getEcsVersion(ecsDir);

  const ecsMappings = readEcsJSONFile(ecsDir, ECS_MAPPINGS_FILE);

  // add our custom fields
  ecsMappings.mappings.properties = {
    ...ecsMappings.mappings.properties,
    ...mappings.EcsCustomPropertyMappings,
  };

  const exportedProperties = mappings.EcsPropertiesToGenerate;
  const multiValuedProperties = new Set(mappings.EcsEventLogMultiValuedProperties);

  augmentMappings(ecsMappings.mappings, multiValuedProperties);

  const elMappings = getEventLogMappings(ecsMappings, exportedProperties);

  console.log(`generating files in ${PLUGIN_DIR}`);
  writeEventLogMappings(elMappings);
  writeEventLogConfigSchema(elMappings, ecsVersion);
  writeEventLogTelemetrySchema(elMappings);
}

// return a stripped down version of the ecs schema, with only exportedProperties
function getEventLogMappings(ecsSchema, exportedProperties) {
  const result = { mappings: { properties: {} } };

  // get full list of properties to copy
  const leafProperties = exportedProperties.map(replaceDotWithProperties);

  // copy the leaf values of the properties
  for (const prop of leafProperties) {
    const value = lodash.get(ecsSchema.mappings.properties, prop);
    set(result.mappings.properties, prop, value);
  }

  // set the non-leaf values as appropriate
  const nonLeafProperties = getNonLeafProperties(exportedProperties).map(replaceDotWithProperties);
  for (const prop of nonLeafProperties) {
    const ecsValue = lodash.get(ecsSchema.mappings.properties, prop);
    const elValue = lodash.get(result.mappings.properties, prop);

    elValue.type = ecsValue.type;
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

function augmentMappings(mappings, multiValuedProperties) {
  for (const prop of multiValuedProperties) {
    const fullProp = replaceDotWithProperties(prop);
    const metaPropName = `${fullProp}.meta`;
    const meta = lodash.get(mappings.properties, metaPropName) || {};
    meta.isArray = 'true';
    set(mappings.properties, metaPropName, meta);
  }
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
    logError(
      `directory not found: ${ecsDir} - did you checkout elastic/ecs as a peer of this repo?`
    );
  }

  return ecsDir;
}

// run as a command-line script
if (require.main === module) main();
