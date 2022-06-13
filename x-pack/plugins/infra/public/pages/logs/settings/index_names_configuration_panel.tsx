/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiDescribedFormGroup, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import { LogIndexNameReference } from '../../../../common/log_views';
import { FormElement } from './form_elements';
import { getFormRowProps, getInputFieldProps } from './form_field_props';
import { FormValidationError } from './validation_errors';

export const IndexNamesConfigurationPanel: React.FC<{
  isLoading: boolean;
  isReadOnly: boolean;
  indexNamesFormElement: FormElement<LogIndexNameReference, FormValidationError>;
}> = ({ isLoading, isReadOnly, indexNamesFormElement }) => {
  useTrackPageview({ app: 'infra_logs', path: 'log_source_configuration_index_name' });
  useTrackPageview({
    app: 'infra_logs',
    path: 'log_source_configuration_index_name',
    delay: 15000,
  });

  return (
    <>
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
