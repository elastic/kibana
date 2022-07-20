/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiStepProps } from '@elastic/eui';
import {
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormErrorText,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import { useLink } from '../../../hooks';

import type { QuickStartCreateForm } from '../hooks';
import { FleetServerHostComboBox } from '../components';

export function getGettingStartedStep({
  quickStartCreateForm,
}: {
  quickStartCreateForm: QuickStartCreateForm;
}): EuiStepProps {
  return {
    title: i18n.translate('xpack.fleet.fleetServerFlyout.getStartedTitle', {
      defaultMessage: 'Get started with Fleet Server',
    }),
    status: quickStartCreateForm.status === 'success' ? 'complete' : 'current',
    children: <GettingStartedStepContent quickStartCreateForm={quickStartCreateForm} />,
  };
}

const GettingStartedStepContent: React.FunctionComponent<{
  quickStartCreateForm: QuickStartCreateForm;
}> = ({ quickStartCreateForm }) => {
  const { getHref } = useLink();

  const { fleetServerHost, fleetServerHostSettings, onFleetServerHostChange } =
    quickStartCreateForm;

  if (quickStartCreateForm.status === 'success') {
    return (
      <EuiCallOut
        color="success"
        iconType="check"
        title={i18n.translate(
          'xpack.fleet.fleetServerFlyout.generateFleetServerPolicySuccessTitle',
          {
            defaultMessage: 'Fleet Server policy created.',
          }
        )}
      >
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.fleetServerFlyout.generateFleetServerPolicySuccessInstructions"
            defaultMessage="Fleet server policy and service token have been generated. Host configured at  {hostUrl}. You can edit your Fleet Server hosts in {fleetSettingsLink}."
            values={{
              hostUrl: <EuiCode>{fleetServerHost}</EuiCode>,
              fleetSettingsLink: (
                <EuiLink href={getHref('settings')}>
                  <FormattedMessage
                    id="xpack.fleet.fleetServerSetup.fleetSettingsLink"
                    defaultMessage="Fleet Settings"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.fleetServerFlyout.getStartedInstructions"
          defaultMessage="First, set the public IP or host name and port that agents will use to reach Fleet Server. It uses port {port} by default. We'll then generate a policy for you automatically."
          values={{ port: <EuiCode>8220</EuiCode> }}
        />
      </EuiText>

      <EuiSpacer size="m" />

      <EuiForm onSubmit={quickStartCreateForm.submit}>
        <EuiFlexGroup>
          <EuiFlexItem
            css={css`
              max-width: 100%;
            `}
          >
            <FleetServerHostComboBox
              fleetServerHost={fleetServerHost}
              fleetServerHostSettings={fleetServerHostSettings}
              isDisabled={quickStartCreateForm.status === 'loading'}
              isInvalid={!!quickStartCreateForm.error}
              onFleetServerHostChange={onFleetServerHostChange}
            />

            {quickStartCreateForm.status === 'error' && (
              <EuiFormErrorText>{quickStartCreateForm.error}</EuiFormErrorText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiButton
          isLoading={quickStartCreateForm.status === 'loading'}
          onClick={quickStartCreateForm.submit}
          data-test-subj="generateFleetServerPolicyButton"
        >
          <FormattedMessage
            id="xpack.fleet.fleetServerFlyout.generateFleetServerPolicyButton"
            defaultMessage="Generate Fleet Server policy"
          />
        </EuiButton>
      </EuiForm>
    </>
  );
};
