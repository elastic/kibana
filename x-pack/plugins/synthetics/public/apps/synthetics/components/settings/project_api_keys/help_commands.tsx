/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const HelpCommands = ({ apiKey }: { apiKey: string }) => {
  return (
    <div className="text-left">
      <EuiCallOut title={API_KEY_WARNING_LABEL} iconType="iInCircle" size="s" />
      <EuiSpacer size="s" />
      <EuiText size="s">
        <strong>{API_KEY_LABEL}</strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="javascript" isCopyable fontSize="s" paddingSize="m" whiteSpace="pre">
        {apiKey}
      </EuiCodeBlock>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <strong>{USE_AS_ENV}</strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="javascript" isCopyable fontSize="s" paddingSize="m">
        export SYNTHETICS_API_KEY={apiKey}
      </EuiCodeBlock>
      <EuiSpacer size="m" />
      <EuiSpacer size="m" />
      <EuiText size="s">
        <strong>{PROJECT_PUSH_COMMAND}</strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="javascript" isCopyable fontSize="s" paddingSize="m">
        SYNTHETICS_API_KEY={apiKey} npm run push
      </EuiCodeBlock>
    </div>
  );
};

const API_KEY_LABEL = i18n.translate('xpack.synthetics.monitorManagement.apiKey.label', {
  defaultMessage: 'API key',
});

const USE_AS_ENV = i18n.translate('xpack.synthetics.monitorManagement.useEnv.label', {
  defaultMessage: 'Use as environment variable',
});

const PROJECT_PUSH_COMMAND = i18n.translate(
  'xpack.synthetics.monitorManagement.projectPush.label',
  {
    defaultMessage: 'Project push command',
  }
);

const API_KEY_WARNING_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.apiKeyWarning.label',
  {
    defaultMessage:
      'This API key will only be shown once. Please keep a copy for your own records.',
  }
);
