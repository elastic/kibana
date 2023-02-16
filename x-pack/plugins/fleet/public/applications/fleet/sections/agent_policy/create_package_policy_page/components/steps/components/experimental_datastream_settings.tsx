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
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useStartServices } from '../../../../../../../../hooks';

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
  const { docLinks } = useStartServices();

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

  const docValueOnlyNumericExperimentalValue = getExperimentalFeatureValue(
    'doc_value_only_numeric',
    experimentalDataFeatures ?? [],
    registryDataStream
  );

  const docValueOnlyOtherExperimentalValue = getExperimentalFeatureValue(
    'doc_value_only_other',
    experimentalDataFeatures ?? [],
    registryDataStream
  );

  const newExperimentalIndexingFeature = {
    synthetic_source:
      typeof syntheticSourceExperimentalValue !== 'undefined'
        ? syntheticSourceExperimentalValue
        : isSyntheticSourceEnabledByDefault,
    tsdb: isTimeSeriesEnabledByDefault
      ? isTimeSeriesEnabledByDefault
      : getExperimentalFeatureValue('tsdb', experimentalDataFeatures ?? [], registryDataStream) ??
        false,
    doc_value_only_numeric:
      typeof docValueOnlyNumericExperimentalValue !== 'undefined'
        ? docValueOnlyNumericExperimentalValue
        : false,
    doc_value_only_other:
      typeof docValueOnlyOtherExperimentalValue !== 'undefined'
        ? docValueOnlyOtherExperimentalValue
        : false,
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
                defaultMessage="Indexing settings (technical preview)"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued" size="xs">
            <p>
              <FormattedMessage
                id="xpack.fleet.packagePolicyEditor.stepConfigure.experimentalFeaturesDescription"
                defaultMessage="Choose how you want to store backing indices for this data stream. Changing these settings may affect other properties."
              />
            </p>
            <p>
              <FormattedMessage
                id="xpack.fleet.packagePolicyEditor.stepConfigure.experimentalFeaturesRolloverWarning"
                defaultMessage="After changing these settings, you need to manually roll over the existing data stream for changes to take effect. {learnMoreLink}"
                values={{
                  learnMoreLink: (
                    <EuiLink href={docLinks.links.fleet.datastreamsManualRollover} target="_blank">
                      {i18n.translate(
                        'xpack.fleet.packagePolicyEditor.experimentalFeatureRolloverLearnMore',
                        { defaultMessage: 'Learn more' }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            </p>
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
          <EuiSwitch
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
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSwitch
            checked={newExperimentalIndexingFeature.doc_value_only_numeric ?? false}
            data-test-subj="packagePolicyEditor.docValueOnlyNumericExperimentalFeature.switch"
            label={
              <FormattedMessage
                id="xpack.fleet.packagePolicyEditor.experimentalFeatures.docValueOnlyNumericLabel"
                defaultMessage="Doc value only (numeric types)"
              />
            }
            onChange={(e) => {
              onIndexingSettingChange({
                doc_value_only_numeric: e.target.checked,
              });
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSwitch
            checked={newExperimentalIndexingFeature.doc_value_only_other ?? false}
            data-test-subj="packagePolicyEditor.docValueOnlyOtherExperimentalFeature.switch"
            label={
              <FormattedMessage
                id="xpack.fleet.packagePolicyEditor.experimentalFeatures.docValueOnlyOtherLabel"
                defaultMessage="Doc value only (other types)"
              />
            }
            onChange={(e) => {
              onIndexingSettingChange({
                doc_value_only_other: e.target.checked,
              });
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
