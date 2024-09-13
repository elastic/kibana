/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiBetaBadge,
  EuiAccordion,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  useGeneratedHtmlId,
  EuiFlexItem,
  EuiFlexGroup,
  useEuiTheme,
} from '@elastic/eui';
import {
  SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ,
  SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ,
} from '../../test_subjects';

export const SetupTechnologySelector = ({
  disabled,
  setupTechnology,
  onSetupTechnologyChange,
}: {
  disabled: boolean;
  setupTechnology: SetupTechnology;
  onSetupTechnologyChange: (value: SetupTechnology) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const agentlessOptionBadge = (isDropDownDisplay: boolean) => {
    const title = isDropDownDisplay ? (
      <strong>
        <FormattedMessage
          id="xpack.csp.fleetIntegration.setupTechnology.agentlessDrowpownDisplay"
          defaultMessage="Agentless"
        />
      </strong>
    ) : (
      <FormattedMessage
        id="xpack.csp.fleetIntegration.setupTechnology.agentlessInputDisplay"
        defaultMessage="Agentless"
      />
    );
    return (
      <EuiFlexGroup alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>{title}</EuiFlexItem>
        <EuiFlexItem css={{ paddingTop: !isDropDownDisplay ? euiTheme.size.xs : undefined }}>
          <EuiBetaBadge
            label={i18n.translate(
              'xpack.csp.fleetIntegration.setupTechnology.agentlessInputDisplay.techPreviewBadge.label',
              {
                defaultMessage: 'Beta',
              }
            )}
            size="m"
            color="hollow"
            tooltipContent={i18n.translate(
              'xpack.csp.fleetIntegration.setupTechnology.agentlessInputDisplay.techPreviewBadge.tooltip',
              {
                defaultMessage:
                  'This functionality is in technical preview and may be changed in a future release. Please help us by reporting any bugs.',
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const options = [
    {
      value: SetupTechnology.AGENT_BASED,
      'data-test-subj': 'setup-technology-agent-based-option',
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
    {
      value: SetupTechnology.AGENTLESS,
      inputDisplay: agentlessOptionBadge(false),
      'data-test-subj': 'setup-technology-agentless-option',
      dropdownDisplay: (
        <>
          {agentlessOptionBadge(true)}
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
  ];

  return (
    <>
      <EuiSpacer size="l" />
      <EuiAccordion
        isDisabled={disabled}
        initialIsOpen={disabled}
        id={useGeneratedHtmlId({ prefix: 'setup-type' })}
        buttonContent={
          <EuiLink disabled={disabled}>
            <FormattedMessage
              id="xpack.csp.fleetIntegration.setupTechnology.advancedOptionsLabel"
              defaultMessage="Advanced options"
            />
          </EuiLink>
        }
        data-test-subj={SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ}
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
      </EuiAccordion>
    </>
  );
};
