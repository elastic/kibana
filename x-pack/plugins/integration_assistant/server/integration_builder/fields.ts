/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import nunjucks from 'nunjucks';

import { createSync, generateFields, mergeSamples } from '../util';

export function createFieldMapping(
  packageName: string,
  dataStreamName: string,
  specificDataStreamDir: string,
  docs: object[]
): void {
  const dataStreamFieldsDir = `${specificDataStreamDir}/fields`;
  createBaseFields(dataStreamFieldsDir, packageName, dataStreamName);
  createCustomFields(dataStreamFieldsDir, docs);
}

function createBaseFields(
  dataStreamFieldsDir: string,
  packageName: string,
  dataStreamName: string
): void {
  const datasetName = `${packageName}.${dataStreamName}`;
  const baseFields = nunjucks.render('base_fields.yml.njk', {
    module: packageName,
    dataset: datasetName,
  });

  createSync(`${dataStreamFieldsDir}/base-fields.yml`, baseFields);
}

function createCustomFields(dataStreamFieldsDir: string, pipelineResults: object[]): void {
  const mergedResults = mergeSamples(pipelineResults);
  const fieldKeys = generateFields(mergedResults);
  createSync(`${dataStreamFieldsDir}/fields.yml`, fieldKeys);
}
