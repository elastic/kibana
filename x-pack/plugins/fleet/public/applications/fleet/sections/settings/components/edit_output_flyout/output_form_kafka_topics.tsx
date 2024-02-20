/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import type { OutputFormInputsType } from './use_output_form';

export const OutputFormKafkaTopics: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => {
  return (
    <EuiPanel
      borderRadius="m"
      hasShadow={false}
      paddingSize={'m'}
      color={'subdued'}
      data-test-subj="settingsOutputsFlyout.kafkaTopicsPanel"
    >
      <EuiTitle size="s">
        <h3 id="FleetEditOutputFlyoutKafkaHeaders">
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaTopcisTitle"
            defaultMessage="Topics"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaTopicsDefaultTopicLabel"
            defaultMessage="Default topic"
          />
        }
        {...inputs.kafkaDefaultTopicInput.formRowProps}
      >
        <EuiFieldText
          data-test-subj="settingsOutputsFlyout.kafkaDefaultTopicInput"
          fullWidth
          {...inputs.kafkaDefaultTopicInput.props}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />
    </EuiPanel>
  );
};
