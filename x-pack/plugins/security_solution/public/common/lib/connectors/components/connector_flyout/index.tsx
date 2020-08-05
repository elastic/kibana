/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { isEmpty, get } from 'lodash/fp';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionConnectorFieldsProps } from '../../../../../../../triggers_actions_ui/public/types';
import { FieldMapping } from '../../../../../cases/components/configure_cases/field_mapping';

import { CasesConfigurationMapping } from '../../../../../cases/containers/configure/types';

import * as i18n from '../../translations';
import { ActionConnector, ConnectorFlyoutHOCProps } from '../../types';
import { createDefaultMapping } from '../../utils';
import { connectorsConfiguration } from '../../config';

export const withConnectorFlyout = <T extends ActionConnector>({
  ConnectorFormComponent,
  connectorActionTypeId,
  secretKeys = [],
  configKeys = [],
}: ConnectorFlyoutHOCProps<T>) => {
  const ConnectorFlyout: React.FC<ActionConnectorFieldsProps<T>> = ({
    action,
    editActionConfig,
    editActionSecrets,
    errors,
  }) => {
    /* We do not provide defaults values to the fields (like empty string for apiUrl) intentionally.
   * If we do, errors will be shown the first time the flyout is open even though the user did not
   * interact with the form. Also, we would like to show errors for empty fields provided by the user.
  /*/
    const { apiUrl, casesConfiguration: { mapping = [] } = {} } = action.config;
    const configKeysWithDefault = [...configKeys, 'apiUrl'];

    const isApiUrlInvalid: boolean = errors.apiUrl.length > 0 && apiUrl != null;

    /**
     * We need to distinguish between the add flyout and the edit flyout.
     * useEffect will run only once on component mount.
     * This guarantees that the function below will run only once.
     * On the first render of the component the apiUrl can be either undefined or filled.
     * If it is filled then we are on the edit flyout. Otherwise we are on the add flyout.
     */

    useEffect(() => {
      if (!isEmpty(apiUrl)) {
        secretKeys.forEach((key: string) => editActionSecrets(key, ''));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (isEmpty(mapping)) {
      editActionConfig('casesConfiguration', {
        ...action.config.casesConfiguration,
        mapping: createDefaultMapping(connectorsConfiguration[connectorActionTypeId].fields),
      });
    }

    const handleOnChangeActionConfig = useCallback(
      (key: string, value: string) => editActionConfig(key, value),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    const handleOnBlurActionConfig = useCallback(
      (key: string) => {
        if (configKeysWithDefault.includes(key) && get(key, action.config) == null) {
          editActionConfig(key, '');
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [action.config]
    );

    const handleOnChangeSecretConfig = useCallback(
      (key: string, value: string) => editActionSecrets(key, value),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    const handleOnBlurSecretConfig = useCallback(
      (key: string) => {
        if (secretKeys.includes(key) && get(key, action.secrets) == null) {
          editActionSecrets(key, '');
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [action.secrets]
    );

    const handleOnChangeMappingConfig = useCallback(
      (newMapping: CasesConfigurationMapping[]) =>
        editActionConfig('casesConfiguration', {
          ...action.config.casesConfiguration,
          mapping: newMapping,
        }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [action.config]
    );

    return (
      <>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              id="apiUrl"
              fullWidth
              error={errors.apiUrl}
              isInvalid={isApiUrlInvalid}
              label={i18n.API_URL_LABEL}
            >
              <EuiFieldText
                fullWidth
                isInvalid={isApiUrlInvalid}
                name="apiUrl"
                value={apiUrl || ''} // Needed to prevent uncontrolled input error when value is undefined
                data-test-subj="apiUrlFromInput"
                placeholder="https://<site-url>"
                onChange={(evt) => handleOnChangeActionConfig('apiUrl', evt.target.value)}
                onBlur={handleOnBlurActionConfig.bind(null, 'apiUrl')}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <ConnectorFormComponent
          errors={errors}
          action={action}
          onChangeSecret={handleOnChangeSecretConfig}
          onBlurSecret={handleOnBlurSecretConfig}
          onChangeConfig={handleOnChangeActionConfig}
          onBlurConfig={handleOnBlurActionConfig}
        />
        <EuiSpacer size="l" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <FieldMapping
              disabled={true}
              connectorActionTypeId={connectorActionTypeId}
              mapping={mapping as CasesConfigurationMapping[]}
              onChangeMapping={handleOnChangeMappingConfig}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  };

  return ConnectorFlyout;
};
