/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescribedFormGroup,
  EuiCode,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { InputFieldProps } from './input_fields';

interface FieldsConfigurationPanelProps {
  containerFieldProps: InputFieldProps;
  hostFieldProps: InputFieldProps;
  isLoading: boolean;
  readOnly: boolean;
  podFieldProps: InputFieldProps;
  timestampFieldProps: InputFieldProps;
}

export const FieldsConfigurationPanel = ({
  containerFieldProps,
  hostFieldProps,
  isLoading,
  readOnly,
  podFieldProps,
  timestampFieldProps,
}: FieldsConfigurationPanelProps) => {
  const isHostValueDefault = hostFieldProps.value === 'host.name';
  const isContainerValueDefault = containerFieldProps.value === 'container.id';
  const isPodValueDefault = podFieldProps.value === 'kubernetes.pod.uid';
  const isTimestampValueDefault = timestampFieldProps.value === '@timestamp';
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
              id="xpack.infra.sourceConfiguration.containerFieldLabel"
              defaultMessage="Container ID"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.containerFieldDescription"
            defaultMessage="Field used to identify Docker containers"
          />
        }
      >
        <EuiFormRow
          error={containerFieldProps.error}
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.containerFieldRecommendedValue"
              defaultMessage="The recommended value is {defaultValue}"
              values={{
                defaultValue: <EuiCode>container.id</EuiCode>,
              }}
            />
          }
          isInvalid={containerFieldProps.isInvalid}
          label={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.containerFieldLabel"
              defaultMessage="Container ID"
            />
          }
        >
          <EuiFieldText
            fullWidth
            disabled={isLoading || isContainerValueDefault}
            readOnly={readOnly}
            isLoading={isLoading}
            {...containerFieldProps}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.hostNameFieldLabel"
              defaultMessage="Host name"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.hostNameFieldDescription"
            defaultMessage="Field used to identify hosts"
          />
        }
      >
        <EuiFormRow
          error={hostFieldProps.error}
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.hostFieldDescription"
              defaultMessage="The recommended value is {defaultValue}"
              values={{
                defaultValue: <EuiCode>host.name</EuiCode>,
              }}
            />
          }
          isInvalid={hostFieldProps.isInvalid}
          label={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.hostFieldLabel"
              defaultMessage="Host name"
            />
          }
        >
          <EuiFieldText
            fullWidth
            disabled={isLoading || isHostValueDefault}
            readOnly={readOnly}
            isLoading={isLoading}
            {...hostFieldProps}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.podFieldLabel"
              defaultMessage="Pod ID"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.podFieldDescription"
            defaultMessage="Field used to identify Kubernetes pods"
          />
        }
      >
        <EuiFormRow
          error={podFieldProps.error}
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.podFieldRecommendedValue"
              defaultMessage="The recommended value is {defaultValue}"
              values={{
                defaultValue: <EuiCode>kubernetes.pod.uid</EuiCode>,
              }}
            />
          }
          isInvalid={podFieldProps.isInvalid}
          label={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.podFieldLabel"
              defaultMessage="Pod ID"
            />
          }
        >
          <EuiFieldText
            fullWidth
            disabled={isLoading || isPodValueDefault}
            readOnly={readOnly}
            isLoading={isLoading}
            {...podFieldProps}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </EuiForm>
  );
};
