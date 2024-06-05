/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { IntegrationSettings } from '../../state';

import * as i18n from './translations';

interface ConfigureIntegrationProps {
  integrationSettings: IntegrationSettings | undefined;
  setIntegrationSettings: (param: IntegrationSettings) => void;
}

export const ConfigureIntegration = React.memo<ConfigureIntegrationProps>(
  ({ integrationSettings, setIntegrationSettings }) => {
    const setIntegrationValues = useCallback(
      (settings: Partial<IntegrationSettings>) =>
        setIntegrationSettings({ ...integrationSettings, ...settings }),
      [integrationSettings, setIntegrationSettings]
    );

    const onChange = useMemo(() => {
      return {
        title: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationValues({ title: e.target.value }),
        description: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationValues({ description: e.target.value }),
        dataStreamTitle: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationValues({ dataStreamTitle: e.target.value }),
        dataStreamDescription: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationValues({ dataStreamDescription: e.target.value }),
      };
    }, [setIntegrationValues]);

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
                name="title"
                value={integrationSettings?.title ?? ''}
                onChange={onChange.title}
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
                value={integrationSettings?.dataStreamTitle ?? ''}
                onChange={onChange.dataStreamTitle}
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
