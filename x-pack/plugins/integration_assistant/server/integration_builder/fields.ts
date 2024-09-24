/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import nunjucks from 'nunjucks';
import { load } from 'js-yaml';
import { Field, flattenObjectsList } from '../util/samples';
import { createSync, generateFields, mergeSamples } from '../util';
export function createFieldMapping(
  packageName: string,
  dataStreamName: string,
  specificDataStreamDir: string,
  docs: object[]
): object[] {
  const baseFields = createBaseFields(specificDataStreamDir, packageName, dataStreamName);
  const customFields = createCustomFields(specificDataStreamDir, docs);

  return mergeFields(baseFields, customFields);
}

function createBaseFields(
  specificDataStreamDir: string,
  packageName: string,
  dataStreamName: string
): Field[] {
  const datasetName = `${packageName}.${dataStreamName}`;
  const baseFields = nunjucks.render('base_fields.yml.njk', {
    module: packageName,
    dataset: datasetName,
  });
  createSync(`${specificDataStreamDir}/base-fields.yml`, baseFields);

  return load(baseFields) as Field[];
}

function createCustomFields(specificDataStreamDir: string, pipelineResults: object[]): Field[] {
  const mergedResults = mergeSamples(pipelineResults);
  const fieldKeys = generateFields(mergedResults);
  createSync(`${specificDataStreamDir}/fields/fields.yml`, fieldKeys);

  return load(fieldKeys) as Field[];
}

function mergeFields(baseFields: Field[], customFields: Field[]): Field[] {
  const fields = [...baseFields, ...customFields];

  return flattenObjectsList(fields);
}
