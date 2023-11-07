/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiText, EuiSpacer, EuiCodeBlock } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';

const Label = euiStyled.div`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeXS};
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
  color: ${({ theme }) => theme.eui.euiColorDarkestShade};
`;

interface Props {
  error: APMError;
}
export function SampleSummary({ error }: Props) {
  const logMessage = error.error.log?.message;
  const excMessage = error.error.exception?.[0].message;
  const culprit = error.error.culprit;

  return (
    <>
      {logMessage && (
        <>
          <EuiText size="s">
            <Label>
              {i18n.translate('xpack.apm.errorGroupDetails.logMessageLabel', {
                defaultMessage: 'Log message',
              })}
            </Label>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiCodeBlock isCopyable>{logMessage}</EuiCodeBlock>
          <EuiSpacer />
        </>
      )}
      <EuiText size="s">
        <Label>
          {i18n.translate('xpack.apm.errorGroupDetails.exceptionMessageLabel', {
            defaultMessage: 'Exception message',
          })}
        </Label>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiCodeBlock isCopyable>
        {excMessage || NOT_AVAILABLE_LABEL}
      </EuiCodeBlock>
      <EuiSpacer />
      <EuiText size="s">
        <Label>
          {i18n.translate('xpack.apm.errorGroupDetails.culpritLabel', {
            defaultMessage: 'Culprit',
          })}
        </Label>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiCodeBlock isCopyable>{culprit || NOT_AVAILABLE_LABEL}</EuiCodeBlock>
      <EuiSpacer />
    </>
  );
}
