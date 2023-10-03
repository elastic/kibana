/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiPanel, EuiSelect, EuiSpacer, EuiSwitch, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import React, { useMemo } from 'react';

import { kafkaCompressionType } from '../../../../../../../common/constants';

import type { OutputFormInputsType } from './use_output_form';

export const OutputFormKafkaCompression: React.FunctionComponent<{
  inputs: OutputFormInputsType;
}> = (props) => {
  const { inputs } = props;

  const kafkaCompressionTypeOptions = useMemo(
    () =>
      (Object.keys(kafkaCompressionType) as Array<keyof typeof kafkaCompressionType>)
        .filter((c) => c !== 'None')
        .map((key) => ({
          text: kafkaCompressionType[key],
          label: kafkaCompressionType[key],
        })),
    []
  );

  const kafkaCompressionLevelOptions = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => i + 1).map((level) => ({
        text: level,
        label: level.toString(),
      })),
    []
  );

  const renderCompression = () => {
    if (!inputs.kafkaCompressionInput.value) {
      return null;
    }

    return (
      <>
        <EuiSpacer size="m" />

        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.kafkaCompressionCodecInputLabel"
              defaultMessage="Codec"
            />
          }
        >
          <EuiSelect
            fullWidth
            data-test-subj="settingsOutputsFlyout.kafkaCompressionCodecInput"
            {...inputs.kafkaCompressionCodecInput.props}
            options={kafkaCompressionTypeOptions}
          />
        </EuiFormRow>

        {inputs.kafkaCompressionCodecInput.value === kafkaCompressionType.Gzip && (
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaCompressionLevelInputLabel"
                defaultMessage="Level"
              />
            }
          >
            <EuiSelect
              fullWidth
              {...inputs.kafkaCompressionLevelInput.props}
              data-test-subj="settingsOutputsFlyout.kafkaCompressionLevelInput"
              options={kafkaCompressionLevelOptions}
            />
          </EuiFormRow>
        )}
      </>
    );
  };

  return (
    <EuiPanel
      borderRadius="m"
      hasShadow={false}
      paddingSize={'m'}
      color={'subdued'}
      data-test-subj="settingsOutputsFlyout.kafkaCompressionPanel"
    >
      <EuiTitle size="s">
        <h3 id="FleetEditOutputFlyoutKafkaCompression">
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaCompressionTitle"
            defaultMessage="Compression"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiSwitch
        data-test-subj={'settingsOutputsFlyout.kafkaCompressionSwitch'}
        {...inputs.kafkaCompressionInput.props}
        onChange={(e) => {
          if (!e.target.checked) {
            // Reset compression codec, if compression is disabled. In Api there is no compression state, only codec and level.
            inputs.kafkaCompressionCodecInput.setValue(kafkaCompressionType.None);
          }
          inputs.kafkaCompressionInput.setValue(e.target.checked);
        }}
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaCompressionSwitchLabel"
            defaultMessage="Enable compression"
          />
        }
      />
      {renderCompression()}
    </EuiPanel>
  );
};
