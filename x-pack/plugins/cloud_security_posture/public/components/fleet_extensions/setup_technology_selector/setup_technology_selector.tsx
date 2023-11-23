/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiAccordion,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';

export const SetupTechnologySelector = ({
  setupTechnology,
  onSetupTechnologyChange,
}: {
  setupTechnology: SetupTechnology;
  onSetupTechnologyChange: (value: SetupTechnology) => void;
}) => {
  const options = [
    {
      value: SetupTechnology.AGENTLESS,
      inputDisplay: (
        <FormattedMessage
          id="xpack.csp.fleetIntegration.setupTechnology.agentlessInputDisplay"
          defaultMessage="Agentless"
        />
      ),
      dropdownDisplay: (
        <>
          <strong>
            <FormattedMessage
              id="xpack.csp.fleetIntegration.setupTechnology.agentlessDrowpownDisplay"
              defaultMessage="Agentless"
            />
          </strong>
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
      <EuiAccordion
        id={useGeneratedHtmlId({ prefix: 'setup-type' })}
        buttonContent={
          <EuiLink>
            <FormattedMessage
              id="xpack.csp.fleetIntegration.setupTechnology.advancedOptionsLabel"
              defaultMessage="Advanced options"
            />
          </EuiLink>
        }
      >
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
          />
        </EuiFormRow>
      </EuiAccordion>
    </>
  );
};
