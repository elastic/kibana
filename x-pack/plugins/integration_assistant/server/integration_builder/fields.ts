/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import nunjucks from 'nunjucks';

import { generateFields, mergeSamples, asyncCreate } from '../util';

interface Doc {
  [key: string]: any;
}

export async function createFieldMapping(
  packageName: string,
  dataStreamName: string,
  specificDataStreamDir: string,
  docs: Doc[]
): Promise<void> {
  await createBaseFields(specificDataStreamDir, packageName, dataStreamName);
  await createCustomFields(specificDataStreamDir, docs);
}

async function createBaseFields(
  specificDataStreamDir: string,
  packageName: string,
  dataStreamName: string
): Promise<void> {
  const datasetName = `${packageName}.${dataStreamName}`;
  const baseFields = nunjucks.render('base-fields.yml.njk', {
    module: packageName,
    dataset: datasetName,
  });

  await asyncCreate(`${specificDataStreamDir}/fields/base-fields.yml`, baseFields);
}

async function createCustomFields(
  specificDataStreamDir: string,
  pipelineResults: Doc[]
): Promise<void> {
  const mergedResults = mergeSamples(pipelineResults);
  const fieldKeys = generateFields(mergedResults);
  await asyncCreate(`${specificDataStreamDir}/fields/fields.yml`, fieldKeys);
}
