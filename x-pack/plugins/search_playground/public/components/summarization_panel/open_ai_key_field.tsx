/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFieldPassword, EuiFlexGroup, EuiFormRow, keys } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import { ChatFormFields } from '../../types';

export const OpenAIKeyField: React.FC = () => {
  const [openAITempValue, setOpenAITempValue] = React.useState('');
  const { setValue, watch } = useFormContext();
  const openAIKey = watch(ChatFormFields.openAIKey);
  const handleSaveValue = () => {
    if (openAITempValue) {
      setValue(ChatFormFields.openAIKey, openAITempValue);
    }
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.searchPlayground.summarization.openAI.labelTitle', {
        defaultMessage: 'OpenAI API Key',
      })}
      fullWidth
    >
      <EuiFlexGroup>
        <EuiFieldPassword
          fullWidth
          placeholder={i18n.translate('xpack.searchPlayground.sidebar.openAIFlyOut.placeholder', {
            defaultMessage: 'Enter API Key here',
          })}
          value={openAITempValue}
          onKeyUp={({ key }) => {
            if (keys.ENTER === key) {
              handleSaveValue();
            }
          }}
          onChange={(e) => setOpenAITempValue(e.target.value)}
        />

        {openAIKey && openAIKey === openAITempValue ? (
          <EuiButton color="success" iconType="check">
            <FormattedMessage
              id="xpack.searchPlayground.summarization.openAI.savedButton"
              defaultMessage="Saved"
            />
          </EuiButton>
        ) : (
          <EuiButton type="submit" disabled={!openAITempValue} onClick={handleSaveValue}>
            <FormattedMessage
              id="xpack.searchPlayground.summarization.openAI.saveButton"
              defaultMessage="Save"
            />
          </EuiButton>
        )}
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
