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
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';
import { FormElement } from './form_elements';
import { getFormRowProps, getStringInputFieldProps } from './form_field_props';
import { FormValidationError } from './validation_errors';

interface FieldsConfigurationPanelProps {
  isLoading: boolean;
  isReadOnly: boolean;
  tiebreakerFieldFormElement: FormElement<string, FormValidationError>;
  timestampFieldFormElement: FormElement<string, FormValidationError>;
}

export const FieldsConfigurationPanel = ({
  isLoading,
  isReadOnly,
  tiebreakerFieldFormElement,
  timestampFieldFormElement,
}: FieldsConfigurationPanelProps) => {
  const isTimestampValueDefault = timestampFieldFormElement.value === '@timestamp';
  const isTiebreakerValueDefault = tiebreakerFieldFormElement.value === '_doc';

  return (
    <>
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
          label={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.timestampFieldLabel"
              defaultMessage="Timestamp"
            />
          }
          {...useMemo(
            () => getFormRowProps(timestampFieldFormElement),
            [timestampFieldFormElement]
          )}
        >
          <EuiFieldText
            fullWidth
            disabled={isLoading || isTimestampValueDefault}
            readOnly={isReadOnly}
            isLoading={isLoading}
            {...useMemo(
              () => getStringInputFieldProps(timestampFieldFormElement),
              [timestampFieldFormElement]
            )}
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
          label={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.tiebreakerFieldLabel"
              defaultMessage="Tiebreaker"
            />
          }
          {...useMemo(
            () => getFormRowProps(tiebreakerFieldFormElement),
            [tiebreakerFieldFormElement]
          )}
        >
          <EuiFieldText
            fullWidth
            disabled={isLoading || isTiebreakerValueDefault}
            readOnly={isReadOnly}
            isLoading={isLoading}
            {...useMemo(
              () => getStringInputFieldProps(tiebreakerFieldFormElement),
              [tiebreakerFieldFormElement]
            )}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </>
  );
};
