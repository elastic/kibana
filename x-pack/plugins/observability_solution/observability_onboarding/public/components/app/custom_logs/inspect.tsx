/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../shared/step_panel';
import { useWizard } from '.';
import { BackButton } from '../../shared/back_button';

export function Inspect() {
  const { goBack, getState, getPath, getUsage } = useWizard();
  return (
    <StepPanel
      title="Inspect wizard"
      panelFooter={<StepPanelFooter items={[<BackButton onBack={goBack} />]} />}
    >
      <StepPanelContent>
        <EuiTitle size="s">
          <h3>
            {i18n.translate(
              'xpack.observability_onboarding.inspect.h3.stateLabel',
              { defaultMessage: 'State' }
            )}
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
            {i18n.translate(
              'xpack.observability_onboarding.inspect.h3.usageLabel',
              { defaultMessage: 'Usage' }
            )}
          </h3>
        </EuiTitle>
        <pre>{JSON.stringify(getUsage(), null, 4)}</pre>
      </StepPanelContent>
    </StepPanel>
  );
}
