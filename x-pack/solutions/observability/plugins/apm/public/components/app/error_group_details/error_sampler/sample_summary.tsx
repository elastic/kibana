/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiText, EuiSpacer, EuiCodeBlock, useEuiFontSize } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from '@emotion/styled';
import type { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';

const Label = styled.div`
  margin-bottom: ${({ theme }) => theme.euiTheme.size.xs};
  font-size: ${() => useEuiFontSize('s').fontSize};
  color: ${({ theme }) => theme.euiTheme.colors.darkestShade};
`;

interface Props {
  error: {
    error: Pick<APMError['error'], 'log' | 'exception' | 'culprit'>;
  };
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
      <EuiCodeBlock isCopyable>{excMessage || NOT_AVAILABLE_LABEL}</EuiCodeBlock>
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
