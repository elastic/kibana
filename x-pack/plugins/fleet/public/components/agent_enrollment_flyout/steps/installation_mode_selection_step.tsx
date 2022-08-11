/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiRadioGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import type { FlyoutMode } from '../types';

export const InstallationModeSelectionStep = ({
  selectedPolicyId,
  mode,
  setMode,
}: {
  selectedPolicyId: string | undefined;
  mode: FlyoutMode;
  setMode: (v: FlyoutMode) => void;
}): EuiContainedStepProps => {
  // radio id has to be unique so that the component works even if appears twice in DOM
  const radioSuffix = 'installation_mode_agent_selection';

  const onChangeCallback = (v: string) => {
    const value = v.split('_')[0];
    if (value === 'managed' || value === 'standalone') {
      setMode(value);
    }
  };

  return {
    status: selectedPolicyId ? undefined : 'disabled',
    title: i18n.translate('xpack.fleet.agentEnrollment.stepInstallType', {
      defaultMessage: 'Enroll in Fleet?',
    }),
    children: selectedPolicyId ? (
      <EuiRadioGroup
        options={[
          {
            id: `managed_${radioSuffix}`,
            label: (
              <FormattedMessage
                data-test-subj="agentFlyoutManagedRadioButtons"
                id="xpack.fleet.agentFlyout.managedRadioOption"
                defaultMessage="{managed} – Enroll in Elastic Agent in Fleet to automatically deploy updates and centrally manage the agent."
                values={{
                  managed: (
                    <strong>
                      <FormattedMessage
                        id="xpack.fleet.agentFlyout.managedMessage"
                        defaultMessage="Enroll in Fleet (recommended)"
                      />
                    </strong>
                  ),
                }}
              />
            ),
          },
          {
            id: `standalone_${radioSuffix}`,
            label: (
              <FormattedMessage
                data-test-subj="agentFlyoutStandaloneRadioButtons"
                id="xpack.fleet.agentFlyout.standaloneRadioOption"
                defaultMessage="{standaloneMessage} – Run an Elastic Agent standalone to configure and update the agent manually on the host where the agent is installed."
                values={{
                  standaloneMessage: (
                    <strong>
                      <FormattedMessage
                        id="xpack.fleet.agentFlyout.standaloneMessage"
                        defaultMessage="Run standalone"
                      />
                    </strong>
                  ),
                }}
              />
            ),
          },
        ]}
        idSelected={`${mode}_${radioSuffix}`}
        onChange={onChangeCallback}
        name={`radio group ${radioSuffix}`}
      />
    ) : null,
  };
};
