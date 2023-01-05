/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';

import type {
  ExperimentalDataStreamFeature,
  RegistryDataStream,
} from '../../../../../../../../../common/types';
import { getRegistryDataStreamAssetBaseName } from '../../../../../../../../../common/services';
import type { ExperimentalIndexingFeature } from '../../../../../../../../../common/types/models/epm';

interface Props {
  registryDataStream: RegistryDataStream;
  experimentalDataFeatures?: ExperimentalDataStreamFeature[];
  setNewExperimentalDataFeatures: (
    experimentalDataFeatures: ExperimentalDataStreamFeature[]
  ) => void;
}

function getExperimentalFeatureValue(
  feature: ExperimentalIndexingFeature,
  experimentalDataFeatures: ExperimentalDataStreamFeature[],
  registryDataStream: RegistryDataStream
) {
  return experimentalDataFeatures?.find(
    ({ data_stream: dataStream, features }) =>
      dataStream === getRegistryDataStreamAssetBaseName(registryDataStream) &&
      typeof features[feature] !== 'undefined'
  )?.features?.[feature];
}

export const ExperimentDatastreamSettings: React.FunctionComponent<Props> = ({
  registryDataStream,
  experimentalDataFeatures,
  setNewExperimentalDataFeatures,
}) => {
  const isSyntheticSourceEditable = registryDataStream.elasticsearch?.source_mode !== 'default';

  const syntheticSourceExperimentalValue = getExperimentalFeatureValue(
    'synthetic_source',
    experimentalDataFeatures ?? [],
    registryDataStream
  );

  const isTimeSeriesEnabledByDefault =
    registryDataStream.elasticsearch?.index_mode === 'time_series';

  const isSyntheticSourceEnabledByDefault =
    registryDataStream.elasticsearch?.source_mode === 'synthetic' || isTimeSeriesEnabledByDefault;

  const newExperimentalIndexingFeature = {
    synthetic_source:
      typeof syntheticSourceExperimentalValue !== 'undefined'
        ? syntheticSourceExperimentalValue
        : isSyntheticSourceEnabledByDefault,
    tsdb: isTimeSeriesEnabledByDefault
      ? isTimeSeriesEnabledByDefault
      : getExperimentalFeatureValue('tsdb', experimentalDataFeatures ?? [], registryDataStream) ??
        false,
  };

  const onIndexingSettingChange = (
    features: Partial<Record<ExperimentalIndexingFeature, boolean>>
  ) => {
    const newExperimentalDataStreamFeatures =
      experimentalDataFeatures?.map((feature) => ({ ...feature })) ?? [];

    const dataStream = getRegistryDataStreamAssetBaseName(registryDataStream);

    const existingSettingRecord = newExperimentalDataStreamFeatures.find(
      (x) => x.data_stream === dataStream
    );
    if (existingSettingRecord) {
      existingSettingRecord.features = {
        ...existingSettingRecord.features,
        ...features,
      };
    } else {
      newExperimentalDataStreamFeatures.push({
        data_stream: dataStream,
        features: { ...newExperimentalIndexingFeature, ...features },
      });
    }

    setNewExperimentalDataFeatures(newExperimentalDataStreamFeatures);
  };

  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <h5>
              <FormattedMessage
                id="xpack.fleet.packagePolicyEditor.experimentalSettings.title"
                defaultMessage="Indexing settings (experimental)"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.fleet.packagePolicyEditor.stepConfigure.experimentalFeaturesDescription"
              defaultMessage="Select data streams to configure indexing options. This is an {experimentalFeature} and may have effects on other properties."
              values={{
                experimentalFeature: (
                  <strong>
                    <FormattedMessage
                      id="xpack.fleet.packagePolicyEditor.experimentalFeatureText"
                      defaultMessage="experimental feature"
                    />
                  </strong>
                ),
              }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiFlexItem>
          <EuiSwitch
            checked={newExperimentalIndexingFeature.synthetic_source ?? false}
            disabled={!isSyntheticSourceEditable}
            data-test-subj="packagePolicyEditor.syntheticSourceExperimentalFeature.switch"
            label={
              <FormattedMessage
                id="xpack.fleet.packagePolicyEditor.experimentalFeatures.syntheticSourceLabel"
                defaultMessage="Synthetic source"
              />
            }
            onChange={(e) => {
              onIndexingSettingChange({
                synthetic_source: e.target.checked,
              });
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiToolTip
            content={
              <FormattedMessage
                id="xpack.fleet.packagePolicyEditor.experimentalFeatures.TSDBTooltip"
                defaultMessage="Enabling this feature is irreversible"
              />
            }
          >
            <EuiSwitch
              disabled={newExperimentalIndexingFeature.tsdb ?? false}
              checked={newExperimentalIndexingFeature.tsdb ?? false}
              data-test-subj="packagePolicyEditor.tsdbExperimentalFeature.switch"
              label={
                <FormattedMessage
                  id="xpack.fleet.packagePolicyEditor.experimentalFeatures.TSDBLabel"
                  defaultMessage="Time-series indexing (TSDB)"
                />
              }
              onChange={(e) => {
                onIndexingSettingChange({
                  tsdb: e.target.checked,
                });
              }}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
