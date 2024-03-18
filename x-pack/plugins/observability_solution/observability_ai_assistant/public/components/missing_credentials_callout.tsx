/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  connectorsManagementHref: string;
}

export function MissingCredentialsCallout(props: Props) {
  return (
    <EuiCallOut
      title={i18n.translate('xpack.observabilityAiAssistant.missingCredentialsCallout.title', {
        defaultMessage: 'Missing credentials',
      })}
      color="primary"
      iconType="iInCircle"
    >
      {i18n.translate('xpack.observabilityAiAssistant.missingCredentialsCallout.description', {
        defaultMessage:
          'You haven’t authorised OpenAI in order to generate responses from the Elastic Assistant. Authorise the model in order to proceed.',
      })}

      <EuiSpacer size="m" />

      <EuiButton
        data-test-subj="observabilityAiAssistantMissingCredentialsCalloutConnectAssistantButton"
        fill
        color="primary"
        href={props.connectorsManagementHref}
      >
        {i18n.translate('xpack.observabilityAiAssistant.missingCredentialsCallout.buttonLabel', {
          defaultMessage: 'Connect Assistant',
        })}
      </EuiButton>
    </EuiCallOut>
  );
}
