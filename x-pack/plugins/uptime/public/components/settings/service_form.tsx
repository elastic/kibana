/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescribedFormGroup, EuiFormRow, EuiFieldText, EuiTitle, EuiSpacer } from '@elastic/eui';
import { SettingsFormProps } from '../../pages/settings';

export const ServiceForm: React.FC<SettingsFormProps> = ({
  onChange,
  loading,
  formFields,
  isDisabled,
}) => (
  <>
    <EuiTitle size="s">
      <h3>
        <FormattedMessage
          id="xpack.uptime.sourceConfiguration.serviceSectionTitle"
          defaultMessage="Synthetic Service"
        />
      </h3>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiDescribedFormGroup
      title={
        <h4>
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.heartbeatServiceTitle"
            defaultMessage="Set these settings to enable synthetics service to run your monitors"
          />
        </h4>
      }
    >
      <EuiFormRow describedByIds={['heartbeatService']} fullWidth label="URL">
        <EuiFieldText
          data-test-subj={`heartbeat-service-input-${loading ? 'loading' : 'loaded'}`}
          fullWidth
          disabled={isDisabled}
          isLoading={loading}
          value={formFields?.serviceUrl || ''}
          onChange={(event: any) => onChange({ serviceUrl: event.currentTarget.value })}
        />
      </EuiFormRow>
      <EuiFormRow describedByIds={['heartbeatService']} fullWidth label="Username">
        <EuiFieldText
          data-test-subj={`heartbeat-service-input-${loading ? 'loading' : 'loaded'}`}
          fullWidth
          disabled={isDisabled}
          isLoading={loading}
          value={formFields?.serviceUsername || ''}
          onChange={(event: any) => onChange({ serviceUsername: event.currentTarget.value })}
        />
      </EuiFormRow>
      <EuiFormRow describedByIds={['heartbeatService']} fullWidth label="Password">
        <EuiFieldText
          data-test-subj={`heartbeat-service-input-${loading ? 'loading' : 'loaded'}`}
          fullWidth
          disabled={isDisabled}
          isLoading={loading}
          value={formFields?.servicePassword || ''}
          onChange={(event: any) => onChange({ servicePassword: event.currentTarget.value })}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  </>
);
