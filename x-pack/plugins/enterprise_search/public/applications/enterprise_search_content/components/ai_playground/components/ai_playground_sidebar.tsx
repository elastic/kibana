/*
 *
 *  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 *  * or more contributor license agreements. Licensed under the Elastic License
 *  * 2.0; you may not use this file except in compliance with the Elastic License
 *  * 2.0.
 *
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';

import { InstructionsField } from './instructions_field';

export const AIPlaygroundSidebar: React.FC = () => {
  const [prompt, setPrompt] = React.useState('');
  const [isIncludeCitations, setIncludeCitations] = React.useState<boolean>(true);

  return (
    <>
      <InstructionsField
        label={i18n.translate(
          'xpack.enterpriseSearch.content.aiPlayground.instructionsField.label',
          {
            defaultMessage: 'Instructions',
          }
        )}
        placeholder={i18n.translate(
          'xpack.enterpriseSearch.content.aiPlayground.instructionsField.placeholder',
          {
            defaultMessage: 'Replace me',
          }
        )}
        helpText={i18n.translate(
          'xpack.enterpriseSearch.content.aiPlayground.instructionsField.help',
          {
            defaultMessage:
              'This is the instruction or question you want the AI to respond to. Be clear and specific for the best results.',
          }
        )}
        value={prompt}
        onChange={setPrompt}
      />

      <EuiFormRow>
        <EuiSwitch
          label={i18n.translate(
            'xpack.enterpriseSearch.content.aiPlayground.citationsField.label',
            {
              defaultMessage: 'Include citations',
            }
          )}
          checked={isIncludeCitations}
          onChange={(e) => setIncludeCitations(e.target.checked)}
        />
      </EuiFormRow>
    </>
  );
};
