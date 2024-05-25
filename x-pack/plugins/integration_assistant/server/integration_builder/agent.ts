/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';

export function createAgentInput(specificDataStreamDir: string, inputTypes: string[]): void {
  const agentDir = path.join(specificDataStreamDir, 'agent', 'stream');
  const agentTemplatesDir = path.join(__dirname, '../templates/agent');
  fs.mkdirSync(agentDir, { recursive: true });

  // Load common options that exists for all .yml.hbs files, to be merged with each specific input file
  const commonFilePath = path.join(agentTemplatesDir, 'common.yml.hbs');
  const commonFile = fs.readFileSync(commonFilePath, 'utf-8');

  for (const inputType of inputTypes) {
    // TODO: Skip httpjson and cel input types for now, requires new prompts.
    if (inputType === 'httpjson' || inputType === 'cel') {
      continue;
    }
    const inputTypeFilePath = path.join(agentTemplatesDir, `${inputType}.yml.hbs`);
    const inputTypeFile = fs.readFileSync(inputTypeFilePath, 'utf-8');

    const combinedContents = `${inputTypeFile}\n${commonFile}`;

    const destinationFilePath = path.join(agentDir, `${inputType}.yml.hbs`);
    fs.writeFileSync(destinationFilePath, combinedContents, 'utf-8');
  }
}
