/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiCallOut,
  EuiCode,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { InputFieldProps } from '../../../components/source_configuration';

interface FieldsConfigurationPanelProps {
  isLoading: boolean;
  readOnly: boolean;
  tiebreakerFieldProps: InputFieldProps;
  timestampFieldProps: InputFieldProps;
}

export const FieldsConfigurationPanel = ({
  isLoading,
  readOnly,
  tiebreakerFieldProps,
  timestampFieldProps,
}: FieldsConfigurationPanelProps) => {
  const isTimestampValueDefault = timestampFieldProps.value === '@timestamp';
  const isTiebreakerValueDefault = tiebreakerFieldProps.value === '_doc';

  return (
    <EuiForm>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.fieldsSectionTitle"
            defaultMessage="Fields"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiCallOut
        title={i18n.translate('xpack.infra.sourceConfiguration.deprecationNotice', {
          defaultMessage: 'Deprecation Notice',
        })}
        color="warning"
        iconType="help"
      >
        <p>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.deprecationMessage"
            defaultMessage="Configuring these fields have been deprecated and will be removed in 8.0.0. This application is designed to work with {ecsLink}, you should adjust your indexing to use the {documentationLink}."
            values={{
              documentationLink: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/infrastructure/guide/7.4/infrastructure-metrics.html"
                  target="BLANK"
                >
                  <FormattedMessage
                    id="xpack.infra.sourceConfiguration.documentedFields"
                    defaultMessage="documented fields"
                  />
                </EuiLink>
              ),
              ecsLink: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/ecs/current/index.html"
                  target="BLANK"
                >
                  ECS
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.timestampFieldLabel"
              defaultMessage="Timestamp"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.timestampFieldDescription"
            defaultMessage="Timestamp used to sort log entries"
          />
        }
      >
        <EuiFormRow
          error={timestampFieldProps.error}
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.timestampFieldRecommendedValue"
              defaultMessage="The recommended value is {defaultValue}"
              values={{
                defaultValue: <EuiCode>@timestamp</EuiCode>,
              }}
            />
          }
          isInvalid={timestampFieldProps.isInvalid}
          label={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.timestampFieldLabel"
              defaultMessage="Timestamp"
            />
          }
        >
          <EuiFieldText
            fullWidth
            disabled={isLoading || isTimestampValueDefault}
            readOnly={readOnly}
            isLoading={isLoading}
            {...timestampFieldProps}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.tiebreakerFieldLabel"
              defaultMessage="Tiebreaker"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.tiebreakerFieldDescription"
            defaultMessage="Field used to break ties between two entries with the same timestamp"
          />
        }
      >
        <EuiFormRow
          error={tiebreakerFieldProps.error}
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.tiebreakerFieldRecommendedValue"
              defaultMessage="The recommended value is {defaultValue}"
              values={{
                defaultValue: <EuiCode>_doc</EuiCode>,
              }}
            />
          }
          isInvalid={tiebreakerFieldProps.isInvalid}
          label={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.tiebreakerFieldLabel"
              defaultMessage="Tiebreaker"
            />
          }
        >
          <EuiFieldText
            fullWidth
            disabled={isLoading || isTiebreakerValueDefault}
            readOnly={readOnly}
            isLoading={isLoading}
            {...tiebreakerFieldProps}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </EuiForm>
  );
};
