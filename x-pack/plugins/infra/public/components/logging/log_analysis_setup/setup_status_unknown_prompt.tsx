/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common/eui_styled_components';

interface Props {
  retry: () => void;
}

export const LogAnalysisSetupStatusUnknownPrompt: React.FunctionComponent<Props> = ({
  retry,
}: Props) => (
  <EmptyPrompt
    title={
      <h2>
        <FormattedMessage
          id="xpack.infra.logs.analysis.setupStatusUnknownTitle"
          defaultMessage="We couldn't determine the status of your ML jobs."
        />
      </h2>
    }
    actions={
      <EuiButton onClick={() => retry()} color="primary" fill>
        {i18n.translate('xpack.infra.logs.analysis.setupStatusTryAgainButton', {
          defaultMessage: 'Try again',
        })}
      </EuiButton>
    }
  />
);

const EmptyPrompt = euiStyled(EuiEmptyPrompt)`
  align-self: center;
`;
