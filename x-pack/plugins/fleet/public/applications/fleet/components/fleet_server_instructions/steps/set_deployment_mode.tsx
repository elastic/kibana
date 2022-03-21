/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import type { EuiStepProps } from '@elastic/eui';
import { EuiRadioGroup, EuiSpacer } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export type DeploymentMode = 'production' | 'quickstart';

export const getSetDeploymentModeStep = ({
  deploymentMode,
  setDeploymentMode,
  disabled,
}: {
  deploymentMode: DeploymentMode;
  setDeploymentMode: (v: DeploymentMode) => void;
  disabled: boolean;
}): EuiStepProps => {
  return {
    title: i18n.translate('xpack.fleet.fleetServerSetup.stepDeploymentModeTitle', {
      defaultMessage: 'Choose a deployment mode for security',
    }),
    status: disabled ? 'disabled' : undefined,
    children: disabled ? null : (
      <DeploymentModeStepContent
        deploymentMode={deploymentMode}
        setDeploymentMode={setDeploymentMode}
      />
    ),
  };
};

const DeploymentModeStepContent = ({
  deploymentMode,
  setDeploymentMode,
}: {
  deploymentMode: DeploymentMode;
  setDeploymentMode: (v: DeploymentMode) => void;
}) => {
  const onChangeCallback = useCallback(
    (v: string) => {
      const value = v.split('_')[0];
      if (value === 'production' || value === 'quickstart') {
        setDeploymentMode(value);
      }
    },
    [setDeploymentMode]
  );

  // radio id has to be unique so that the component works even if appears twice in DOM (Agents tab, Add agent flyout)
  const radioSuffix = useMemo(() => Date.now(), []);

  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.fleetServerSetup.stepDeploymentModeDescriptionText"
          defaultMessage="Fleet uses Transport Layer Security (TLS) to encrypt traffic between Elastic Agents and other components in the Elastic Stack. Choose a deployment mode to determine how you wish to handle certificates. Your selection will affect the Fleet Server set up command shown in a later step."
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiRadioGroup
        options={[
          {
            id: `quickstart_${radioSuffix}`,
            label: (
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.deploymentModeQuickStartOption"
                defaultMessage="{quickStart} – Fleet Server will generate a self-signed certificate. Subsequent agents must be enrolled using the --insecure flag. Not recommended for production use cases."
                values={{
                  quickStart: (
                    <strong>
                      <FormattedMessage
                        id="xpack.fleet.fleetServerSetup.quickStartText"
                        defaultMessage="Quick start"
                      />
                    </strong>
                  ),
                }}
              />
            ),
          },
          {
            id: `production_${radioSuffix}`,
            label: (
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.deploymentModeProductionOption"
                defaultMessage="{production} – Provide your own certificates. This option will require agents to specify a cert key when enrolling with Fleet"
                values={{
                  production: (
                    <strong>
                      <FormattedMessage
                        id="xpack.fleet.fleetServerSetup.productionText"
                        defaultMessage="Production"
                      />
                    </strong>
                  ),
                }}
              />
            ),
          },
        ]}
        idSelected={`${deploymentMode}_${radioSuffix}`}
        onChange={onChangeCallback}
        name={`radio group ${radioSuffix}`}
      />
    </>
  );
};
