/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

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
  const { euiTheme } = useEuiTheme();
  const agentlessOptionBadge = (isDropDownDisplay: boolean) => {
    const title = isDropDownDisplay ? (
      <strong>
        <FormattedMessage
          id="xpack.fleet.setupTechnology.agentlessDrowpownDisplay"
          defaultMessage="Agentless"
        />
      </strong>
    ) : (
      <FormattedMessage
        id="xpack.fleet.setupTechnology.agentlessInputDisplay"
        defaultMessage="Agentless"
      />
    );
    return (
      <EuiFlexGroup alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>{title}</EuiFlexItem>
        <EuiFlexItem css={{ paddingTop: !isDropDownDisplay ? euiTheme.size.xs : undefined }}>
          <EuiBetaBadge
            label={i18n.translate(
              'xpack.fleet.setupTechnology.agentlessInputDisplay.techPreviewBadge.label',
              {
                defaultMessage: 'Beta',
              }
            )}
            size="m"
            color="hollow"
            tooltipContent={i18n.translate(
              'xpack.fleet.setupTechnology.agentlessInputDisplay.techPreviewBadge.tooltip',
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
          id="xpack.fleet.setupTechnology.agentbasedInputDisplay"
          defaultMessage="Agent-based"
        />
      ),
      dropdownDisplay: (
        <>
          <strong>
            <FormattedMessage
              id="xpack.fleet.setupTechnology.agentbasedDrowpownDisplay"
              defaultMessage="Agent-based"
            />
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.fleet.setupTechnology.agentbasedDrowpownDescription"
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
                id="xpack.fleet.setupTechnology.agentlessDrowpownDescription"
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
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.setupTechnology.setupTechnologyLabel"
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
              id="xpack.fleet.setupTechnology.setupTechnologyPlaceholder"
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
