/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import { LogIndexNameReference } from '../../../../common/log_sources';
import { FormElement } from './form_elements';
import { getFormRowProps, getInputFieldProps } from './form_field_props';
import { FormValidationError } from './validation_errors';

export const IndexNamesConfigurationPanel: React.FC<{
  isLoading: boolean;
  isReadOnly: boolean;
  indexNamesFormElement: FormElement<LogIndexNameReference, FormValidationError>;
  onSwitchToIndexPatternReference: () => void;
}> = ({ isLoading, isReadOnly, indexNamesFormElement, onSwitchToIndexPatternReference }) => {
  useTrackPageview({ app: 'infra_logs', path: 'log_source_configuration_index_name' });
  useTrackPageview({
    app: 'infra_logs',
    path: 'log_source_configuration_index_name',
    delay: 15000,
  });

  return (
    <>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.indicesSectionTitle"
            defaultMessage="Indices"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiCallOut title={deprecationCalloutTitle} color="warning" iconType="alert">
        <FormattedMessage
          tagName="p"
          id="xpack.infra.logSourceConfiguration.indexNameReferenceDeprecationDescription"
          defaultMessage="Referring to Elasticsearch indices directly is a deprecated way of configuring a log source. Instead, log source now integrate with Kibana index patterns to configure the used indices."
        />
        <EuiButton color="warning" onClick={onSwitchToIndexPatternReference}>
          <FormattedMessage
            id="xpack.infra.logSourceConfiguration.switchToIndexPatternReferenceButtonLabel"
            defaultMessage="Use Kibana index patterns"
          />
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.logIndicesTitle"
              defaultMessage="Log indices"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.logIndicesDescription"
            defaultMessage="Index pattern for matching indices that contain log data"
          />
        }
      >
        <EuiFormRow
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.logIndicesRecommendedValue"
              defaultMessage="The recommended value is {defaultValue}"
              values={{
                defaultValue: <EuiCode>logs-*,filebeat-*</EuiCode>,
              }}
            />
          }
          label={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.logIndicesLabel"
              defaultMessage="Log indices"
            />
          }
          {...getFormRowProps(indexNamesFormElement)}
        >
          <EuiFieldText
            data-test-subj="logIndicesInput"
            fullWidth
            disabled={isLoading}
            isLoading={isLoading}
            readOnly={isReadOnly}
            {...getIndexNamesInputFieldProps(indexNamesFormElement)}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </>
  );
};

const getIndexNamesInputFieldProps = getInputFieldProps<LogIndexNameReference>(
  (value) => ({
    type: 'index_name',
    indexName: value,
  }),
  ({ indexName }) => indexName
);

const deprecationCalloutTitle = i18n.translate(
  'xpack.infra.logSourceConfiguration.indexNameReferenceDeprecationTitle',
  {
    defaultMessage: 'Deprecated configuration option',
  }
);
