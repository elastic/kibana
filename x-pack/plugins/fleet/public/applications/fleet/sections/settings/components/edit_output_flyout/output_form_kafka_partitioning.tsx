/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldText,
  EuiFormRow,
  EuiPanel,
  EuiRadioGroup,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import { kafkaPartitionType } from '../../../../../../../common/constants';

import type { OutputFormInputsType } from './use_output_form';

const kafkaPartitioningOptions = [
  {
    id: kafkaPartitionType.Random,
    label: 'Random',
    'data-test-subj': 'kafkaPartitionRandomRadioButton',
  },
  {
    id: kafkaPartitionType.RoundRobin,
    label: 'Round robin',
    'data-test-subj': 'kafkaPartitionRoundRobinRadioButton',
  },
  {
    id: kafkaPartitionType.Hash,
    label: 'Hash',
    'data-test-subj': 'kafkaPartitionHashRadioButton',
  },
];

export const OutputFormKafkaPartitioning: React.FunctionComponent<{
  inputs: OutputFormInputsType;
}> = (props) => {
  const { inputs } = props;

  const renderPartitioning = () => {
    switch (inputs.kafkaPartitionTypeInput.value) {
      case kafkaPartitionType.Random:
        return (
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaPartitionTypeRandomInputLabel"
                defaultMessage="Number of events"
              />
            }
            {...inputs.kafkaPartitionTypeRandomInput.formRowProps}
          >
            <EuiFieldText
              data-test-subj="settingsOutputsFlyout.kafkaPartitionTypeRandomInput"
              fullWidth
              {...inputs.kafkaPartitionTypeRandomInput.props}
            />
          </EuiFormRow>
        );
      case kafkaPartitionType.RoundRobin:
        return (
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaPartitionTypeRoundRobinInputLabel"
                defaultMessage="Number of events"
              />
            }
            {...inputs.kafkaPartitionTypeRoundRobinInput.formRowProps}
          >
            <EuiFieldText
              data-test-subj="settingsOutputsFlyout.kafkaPartitionTypeRoundRobinInput"
              fullWidth
              {...inputs.kafkaPartitionTypeRoundRobinInput.props}
            />
          </EuiFormRow>
        );
      case kafkaPartitionType.Hash:
      default:
        return (
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaPartitionTypeHashInputLabel"
                defaultMessage="List of fields"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaPartitionTypeHashHelpTextLabel"
                defaultMessage="Comma separated."
              />
            }
          >
            <>
              <EuiFieldText
                data-test-subj="settingsOutputsFlyout.kafkaPartitionTypeHashInput"
                fullWidth
                {...inputs.kafkaPartitionTypeHashInput.props}
              />
            </>
          </EuiFormRow>
        );
    }
  };

  return (
    <EuiPanel
      borderRadius="m"
      hasShadow={false}
      paddingSize={'m'}
      color={'subdued'}
      data-test-subj="settingsOutputsFlyout.kafkaPartitionPanel"
    >
      <EuiTitle size="s">
        <h3 id="FleetEditOutputFlyoutKafkaPartitionTitle">
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaPartitionTitle"
            defaultMessage="Partitioning"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaPartitioningInputLabel"
            defaultMessage="Partitioning strategy"
          />
        }
      >
        <EuiRadioGroup
          style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 30 }}
          data-test-subj={'settingsOutputsFlyout.kafkaPartitioningRadioInput'}
          options={kafkaPartitioningOptions}
          compressed
          {...inputs.kafkaPartitionTypeInput.props}
        />
      </EuiFormRow>
      {renderPartitioning()}
    </EuiPanel>
  );
};
