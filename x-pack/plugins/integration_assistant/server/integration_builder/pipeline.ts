/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { join as joinPath } from 'path';
import yaml from 'js-yaml';
import { asyncCreate } from '../util';

export async function createPipeline(specificDataStreamDir: string, pipeline: object) {
  const filePath = joinPath(specificDataStreamDir, 'elasticsearch/ingest_pipeline/default.yml');
  const yamlContent = '---\n' + yaml.dump(pipeline, { sortKeys: false });
  await asyncCreate(filePath, yamlContent);
}
