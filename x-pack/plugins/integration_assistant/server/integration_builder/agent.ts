/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join as joinPath } from 'path';
import { InputTypes } from '../../common';
import { asyncEnsureDir, asyncCreate, asyncRead } from '../util';

export async function createAgentInput(
  specificDataStreamDir: string,
  inputTypes: InputTypes[]
): Promise<void> {
  const agentDir = joinPath(specificDataStreamDir, 'agent', 'stream');
  const agentTemplatesDir = joinPath(__dirname, '../templates/agent');
  await asyncEnsureDir(agentDir);

  // Load common options that exists for all .yml.hbs files, to be merged with each specific input file
  const commonFilePath = joinPath(agentTemplatesDir, 'common.yml.hbs');
  const commonFile = await asyncRead(commonFilePath);

  for (const inputType of inputTypes) {
    const inputTypeFilePath = joinPath(agentTemplatesDir, `${inputType}.yml.hbs`);
    const inputTypeFile = await asyncRead(inputTypeFilePath);

    const combinedContents = `${inputTypeFile}\n${commonFile}`;

    const destinationFilePath = joinPath(agentDir, `${inputType}.yml.hbs`);
    await asyncCreate(destinationFilePath, combinedContents);
  }
}
