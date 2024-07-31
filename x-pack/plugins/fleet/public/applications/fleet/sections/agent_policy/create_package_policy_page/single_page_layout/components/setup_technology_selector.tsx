/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBetaBadge, EuiFormRow, EuiSpacer, EuiSuperSelect, EuiText } from '@elastic/eui';

import { SetupTechnology } from '../../../../../types';

export const SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ = 'setup-technology-selector';

export const SetupTechnologySelector = ({
  disabled,
  setupTechnology,
  onSetupTechnologyChange,
}: {
  disabled: boolean;
  setupTechnology: SetupTechnology;
  onSetupTechnologyChange: (value: SetupTechnology) => void;
}) => {
  const options = [
    {
      value: SetupTechnology.AGENTLESS,
      inputDisplay: (
        <>
          <FormattedMessage
            id="xpack.csp.fleetIntegration.setupTechnology.agentlessInputDisplay"
            defaultMessage="Agentless"
          />
          &nbsp;
          <EuiBetaBadge
            label="Beta"
            size="s"
            tooltipContent="This module is not GA. Please help us by reporting any bugs."
          />
        </>
      ),
      dropdownDisplay: (
        <>
          <strong>
            <FormattedMessage
              id="xpack.csp.fleetIntegration.setupTechnology.agentlessDrowpownDisplay"
              defaultMessage="Agentless"
            />
          </strong>
          &nbsp;
          <EuiBetaBadge
            label="Beta"
            size="s"
            tooltipContent="This module is not GA. Please help us by reporting any bugs."
          />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.csp.fleetIntegration.setupTechnology.agentlessDrowpownDescription"
                defaultMessage="Set up the integration without an agent"
              />
            </p>
          </EuiText>
        </>
      ),
    },
    {
      value: SetupTechnology.AGENT_BASED,
      inputDisplay: (
        <FormattedMessage
          id="xpack.csp.fleetIntegration.setupTechnology.agentbasedInputDisplay"
          defaultMessage="Agent-based"
        />
      ),
      dropdownDisplay: (
        <>
          <strong>
            <FormattedMessage
              id="xpack.csp.fleetIntegration.setupTechnology.agentbasedDrowpownDisplay"
              defaultMessage="Agent-based"
            />
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.csp.fleetIntegration.setupTechnology.agentbasedDrowpownDescription"
                defaultMessage="Set up the integration with an agent"
              />
            </p>
          </EuiText>
        </>
      ),
    },
  ];

  return (
    <>
      <EuiSpacer size="l" />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.csp.fleetIntegration.setupTechnology.setupTechnologyLabel"
            defaultMessage="Setup technology"
          />
        }
      >
        <EuiSuperSelect
          disabled={disabled}
          options={options}
          valueOfSelected={setupTechnology}
          placeholder={
            <FormattedMessage
              id="xpack.csp.fleetIntegration.setupTechnology.setupTechnologyPlaceholder"
              defaultMessage="Select the setup technology"
            />
          }
          onChange={onSetupTechnologyChange}
          itemLayoutAlign="top"
          hasDividers
          fullWidth
          data-test-subj={SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ}
        />
      </EuiFormRow>
    </>
  );
};
