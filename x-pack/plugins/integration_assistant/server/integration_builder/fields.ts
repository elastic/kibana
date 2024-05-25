/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as fs from 'fs';
import * as path from 'path';
import nunjucks from 'nunjucks';
import { mergeSamples } from '../util/samples';
import { generateFields } from '../util/samples';

interface Doc {
  [key: string]: any;
}

function createFieldMapping(
  packageName: string,
  dataStreamName: string,
  specificDataStreamDir: string,
  docs: Doc[]
): void {
  const fieldsTemplatesDir = path.join(__dirname, '../templates/fields');

  const env = nunjucks.configure(fieldsTemplatesDir, { autoescape: true });

  createBaseFields(specificDataStreamDir, packageName, dataStreamName, env);
  createCustomFields(specificDataStreamDir, docs);
}

function createBaseFields(
  specificDataStreamDir: string,
  packageName: string,
  dataStreamName: string,
  env: nunjucks.Environment
): void {
  const baseFieldsTemplate = env.getTemplate('base-fields.yml.njk');
  const datasetName = `${packageName}.${dataStreamName}`;
  const baseFieldsResult = baseFieldsTemplate.render({ module: packageName, dataset: datasetName });

  fs.writeFileSync(`${specificDataStreamDir}/fields/base-fields.yml`, baseFieldsResult, {
    encoding: 'utf-8',
  });
}

function createCustomFields(specificDataStreamDir: string, pipelineResults: Doc[]): void {
  const mergedResults = mergeSamples(pipelineResults);
  const fieldKeys = generateFields(mergedResults);
  fs.writeFileSync(`${specificDataStreamDir}/fields/fields.yml`, fieldKeys, { encoding: 'utf-8' });
}

export { createFieldMapping };
