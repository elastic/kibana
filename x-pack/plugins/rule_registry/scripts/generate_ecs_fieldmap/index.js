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
const { mapValues } = require('lodash');

const exists = util.promisify(fs.exists);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);
const rmdir = util.promisify(fs.rmdir);
const exec = util.promisify(execCb);

const ecsDir = path.resolve(__dirname, '../../../../../../ecs');
const ecsTemplateFilename = path.join(ecsDir, 'generated/elasticsearch/7/template.json');
const flatYamlFilename = path.join(ecsDir, 'generated/ecs/ecs_flat.yml');

const outputDir = path.join(__dirname, '../../server/generated');

const outputFieldMapFilename = path.join(outputDir, 'ecs_field_map.ts');
const outputMappingFilename = path.join(outputDir, 'ecs_mappings.json');

async function generate() {
  const allExists = await Promise.all([exists(ecsDir), exists(ecsTemplateFilename)]);

  if (!allExists.every(Boolean)) {
    throw new Error(
      `Directory not found: ${ecsDir} - did you checkout elastic/ecs as a peer of this repo?`
    );
  }

  const [template, flatYaml] = await Promise.all([
    readFile(ecsTemplateFilename, { encoding: 'utf-8' }).then((str) => JSON.parse(str)),
    (async () => yaml.safeLoad(await readFile(flatYamlFilename)))(),
  ]);

  const mappings = {
    properties: template.mappings.properties,
  };

  const fields = mapValues(flatYaml, (description) => {
    return {
      type: description.type,
      array: description.normalize.includes('array'),
      required: !!description.required,
    };
  });

  const hasOutputDir = await exists(outputDir);

  if (hasOutputDir) {
    await rmdir(outputDir, { recursive: true });
  }

  await mkdir(outputDir);

  await Promise.all([
    writeFile(
      outputFieldMapFilename,
      `
    export const ecsFieldMap = ${JSON.stringify(fields, null, 2)} as const
    `,
      { encoding: 'utf-8' }
    ).then(() => {
      return exec(`node scripts/eslint --fix ${outputFieldMapFilename}`);
    }),
    writeFile(outputMappingFilename, JSON.stringify(mappings, null, 2)),
  ]);
}

generate().catch((err) => {
  console.log(err);
  process.exit(1);
});
