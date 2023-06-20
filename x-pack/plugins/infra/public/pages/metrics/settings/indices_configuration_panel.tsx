/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiCode,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { METRICS_INDEX_PATTERN } from '../../../../common/constants';
import { InputFieldProps } from './input_fields';

interface IndicesConfigurationPanelProps {
  isLoading: boolean;
  readOnly: boolean;
  metricAliasFieldProps: InputFieldProps;
  metricIndicesExist?: boolean;
  remoteClustersExist?: boolean;
}

const METRIC_INDICES_WARNING_TITLE = i18n.translate(
  'xpack.infra.sourceConfiguration.metricIndicesDoNotExistTitle',
  {
    defaultMessage: 'No matching index found',
  }
);

const REMOTE_CLUSTER_ERROR_TITLE = i18n.translate(
  'xpack.infra.sourceConfiguration.remoteClusterConnectionDoNotExistTitle',
  {
    defaultMessage: 'Couldn’t connect to the remote cluster',
  }
);

export const IndicesConfigurationPanel = ({
  isLoading,
  readOnly,
  metricAliasFieldProps,
  metricIndicesExist,
  remoteClustersExist,
}: IndicesConfigurationPanelProps) => (
  <EuiForm>
    <EuiTitle size="s">
      <h3>
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.indicesSectionTitle"
          defaultMessage="Indices"
        />
      </h3>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiDescribedFormGroup
      title={
        <h4>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.metricIndicesTitle"
            defaultMessage="Metrics indices"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.metricIndicesDescription"
          defaultMessage="Index pattern for matching indices that contain metrics data"
        />
      }
    >
      <EuiFormRow
        error={metricAliasFieldProps.error}
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.metricIndicesRecommendedValue"
            defaultMessage="The recommended value is {defaultValue}"
            values={{
              defaultValue: <EuiCode>{METRICS_INDEX_PATTERN}</EuiCode>,
            }}
          />
        }
        isInvalid={metricAliasFieldProps.isInvalid}
        label={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.metricIndicesLabel"
            defaultMessage="Metrics indices"
          />
        }
      >
        <EuiFieldText
          data-test-subj="metricIndicesInput"
          fullWidth
          disabled={isLoading}
          readOnly={readOnly}
          isLoading={isLoading}
          {...metricAliasFieldProps}
        />
      </EuiFormRow>
      {remoteClustersExist && !metricIndicesExist && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            size="s"
            title={METRIC_INDICES_WARNING_TITLE}
            color="warning"
            iconType="warning"
            data-test-subj="infraIndicesPanelSettingsWarningCallout"
          >
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.metricIndicesDoNotExist"
              defaultMessage="We couldn’t find any metrics data because the pattern entered doesn’t match any index."
            />
          </EuiCallOut>
        </>
      )}
      {!remoteClustersExist && !metricIndicesExist && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            data-test-subj="infraIndicesPanelSettingsDangerCallout"
            size="s"
            title={REMOTE_CLUSTER_ERROR_TITLE}
            color="danger"
            iconType="error"
          >
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.remoteClusterConnectionDoNotExist"
              defaultMessage="Check that the remote cluster is available or that the remote connection settings are
              correct."
            />
          </EuiCallOut>
        </>
      )}
    </EuiDescribedFormGroup>
  </EuiForm>
);
