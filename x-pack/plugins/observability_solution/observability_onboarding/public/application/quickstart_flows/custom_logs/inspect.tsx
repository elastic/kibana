/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useWizard } from '.';
import { BackButton } from '../../shared/back_button';
import { StepModal } from '../shared/step_panel';

export function Inspect() {
  const { getState, getPath, getUsage } = useWizard();
  return (
    <StepModal
      title={i18n.translate('xpack.observability_onboarding.inspect.stepPanel.inspectWizardLabel', {
        defaultMessage: 'Inspect wizard',
      })}
      panelFooter={[<BackButton />]}
    >
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.observability_onboarding.inspect.h3.stateLabel', {
            defaultMessage: 'State',
          })}
        </h3>
      </EuiTitle>
      <pre>{JSON.stringify(getState(), null, 4)}</pre>
      <EuiSpacer size="m" />
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.observability_onboarding.inspect.h3.pathLabel"
            defaultMessage="Path"
          />
        </h3>
      </EuiTitle>
      <pre>{JSON.stringify(getPath(), null, 4)}</pre>
      <EuiSpacer size="m" />
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.observability_onboarding.inspect.h3.usageLabel', {
            defaultMessage: 'Usage',
          })}
        </h3>
      </EuiTitle>
      <pre>{JSON.stringify(getUsage(), null, 4)}</pre>
    </StepModal>
  );
}
