/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiSteps, EuiText, EuiCodeBlock } from '@elastic/eui';
import { Writer } from 'mustache';
export { ShellEnrollmentInstructions } from './shell';
export { ContainerEnrollmentInstructions } from './container';
export { ToolsEnrollmentInstructions } from './tools';

export type ManualEnrollmentInstructions = Array<{
  title: string;
  textPre?: string;
  commands?: string;
  commandsLang?: 'bash' | 'yaml';
}>;

export const ManualEnrollmentSteps: React.FC<{ instructions: ManualEnrollmentInstructions }> = ({
  instructions,
}) => (
  <EuiSteps
    steps={instructions.map(({ title, textPre, commands, commandsLang }) => ({
      title,
      children: (
        <EuiText size="s">
          {textPre ? <p>{textPre}</p> : null}
          {commands ? (
            // TODO: Increase overflowHeight when https://github.com/elastic/eui/issues/2435 is fixed
            // or be smarter with setting this number before release
            <EuiCodeBlock overflowHeight={150} language={commandsLang || 'bash'} isCopyable>
              {replaceTemplateStrings(commands.trim())}
            </EuiCodeBlock>
          ) : null}
        </EuiText>
      ),
    }))}
  />
);

// Setup for replacing template variables in install instructions
const mustacheWriter = new Writer();

// do not html escape output
// @ts-ignore
mustacheWriter.escapedValue = function escapedValue(token, context) {
  const value = context.lookup(token[1]);
  if (value != null) {
    return value;
  }
};

// Configure available variable values
export function replaceTemplateStrings(text: string = '') {
  const variables = {
    config: {
      enrollmentToken: 'sometesttoken',
    },
  };
  mustacheWriter.parse(text);
  return mustacheWriter.render(text, variables, () => {});
}
