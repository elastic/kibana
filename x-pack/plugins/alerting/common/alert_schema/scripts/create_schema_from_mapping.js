/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const path = require('path');
const fs = require('fs');
const util = require('util');
const yaml = require('js-yaml');
const { exec: execCb } = require('child_process');
const { reduce } = require('lodash');
const LineWriter = require('./lib/line_writer');

const exists = util.promisify(fs.exists);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const exec = util.promisify(execCb);

const ecsDir = path.resolve(__dirname, '../../../../../../ecs');
const ecsYamlFilename = path.join(ecsDir, 'generated/ecs/ecs_flat.yml');

const outputDir = path.join(__dirname, '../assets/field_maps');
const outputFieldMapFilename = path.join(outputDir, 'ecs_field_map.ts');

async function createSchema() {
  if (process.argv.length < 3) {
    logError(`Error no mapping file specified`);
  }

  const mappingFile = process.argv[2];
  // eslint-disable-next-line import/no-dynamic-require
  const template = require(mappingFile);

  // const lineWriter = LineWriter.createLineWriter();
  // generateSchemaLines(lineWriter, null, template.mappings);
  // // last line will have an extraneous comma
  // const schemaLines = lineWriter.getContent().replace(/,$/, '');

  // const contents = getSchemaFileContents(ecsVersion, schemaLines);
  // const schemaCode = `${contents}\n`;

  // writeGeneratedFile(EVENT_LOG_CONFIG_SCHEMA_FILE, schemaCode);
  // console.log('generated:', EVENT_LOG_CONFIG_SCHEMA_FILE);
}

function logError(message) {
  console.log(`error: ${message}`);
  process.exit(1);
}

createSchema().catch((err) => {
  console.log(err);
  process.exit(1);
});
