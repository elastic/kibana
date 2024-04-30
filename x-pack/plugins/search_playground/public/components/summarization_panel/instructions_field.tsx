/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFormRow, EuiIcon, EuiTextArea, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';

interface InstructionsFieldProps {
  value?: string;
  onChange: (value: string) => void;
}

export const InstructionsField: React.FC<InstructionsFieldProps> = ({ value, onChange }) => {
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    onChange(e.target.value);

  return (
    <EuiFormRow
      label={
        <EuiToolTip
          content={i18n.translate('xpack.searchPlayground.sidebar.instructionsField.help', {
            defaultMessage:
              'These preliminary instructions and guidelines define the behavior of the model. Be clear and specific for best results.',
          })}
        >
          <>
            <span>
              {i18n.translate('xpack.searchPlayground.sidebar.instructionsField.label', {
                defaultMessage: 'Instructions',
              })}
            </span>
            <EuiIcon type="questionInCircle" color="subdued" />
          </>
        </EuiToolTip>
      }
    >
      <EuiTextArea
        placeholder={i18n.translate(
          'xpack.searchPlayground.sidebar.instructionsField.placeholder',
          {
            defaultMessage: 'Replace me',
          }
        )}
        value={value}
        onChange={handlePromptChange}
        fullWidth
        isInvalid={isEmpty(value)}
      />
    </EuiFormRow>
  );
};
