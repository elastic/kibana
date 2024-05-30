/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { IntegrationSettings } from '../../types';

import * as i18n from './translations';

interface ConfigureIntegrationProps {
  integrationSettings: IntegrationSettings | undefined;
  setIntegrationSettings: (param: IntegrationSettings) => void;
}

export const ConfigureIntegration = React.memo<ConfigureIntegrationProps>(
  ({ integrationSettings, setIntegrationSettings }) => {
    const onChange = useMemo(() => {
      return {
        name: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationSettings({ ...integrationSettings, name: e.target.value }),
        description: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationSettings({ ...integrationSettings, description: e.target.value }),
        dataStreamName: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationSettings({ ...integrationSettings, dataStreamName: e.target.value }),
        dataStreamDescription: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationSettings({ ...integrationSettings, dataStreamDescription: e.target.value }),
      };
    }, [integrationSettings, setIntegrationSettings]);

    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h6>{i18n.INTEGRATION_DETAILS_TITLE}</h6>
          </EuiTitle>
          <EuiSpacer size="s" />
          <p>{i18n.INTEGRATION_DETAILS_DESCRIPTION}</p>
          <EuiSpacer size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiForm component="form" fullWidth>
            <EuiFormRow label={i18n.NAME_LABEL}>
              <EuiFieldText
                name="name"
                value={integrationSettings?.name ?? ''}
                onChange={onChange.name}
              />
            </EuiFormRow>
            <EuiFormRow label={i18n.DESCRIPTION_LABEL}>
              <EuiFieldText
                name="description"
                value={integrationSettings?.description ?? ''}
                onChange={onChange.description}
              />
            </EuiFormRow>
            <EuiFormRow label={i18n.DATASTREAM_NAME_LABEL}>
              <EuiFieldText
                name="datastream_name"
                value={integrationSettings?.dataStreamName ?? ''}
                onChange={onChange.dataStreamName}
              />
            </EuiFormRow>
            <EuiFormRow label={i18n.DATASTREAM_DESCRIPTION_LABEL}>
              <EuiFieldText
                name="datastream_description"
                value={integrationSettings?.dataStreamDescription ?? ''}
                onChange={onChange.dataStreamDescription}
              />
            </EuiFormRow>
          </EuiForm>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
ConfigureIntegration.displayName = 'ConfigureIntegration';
