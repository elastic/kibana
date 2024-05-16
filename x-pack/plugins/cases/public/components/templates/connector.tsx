/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import type { FieldConfig, FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionConnector } from '../../../common/types/domain';
import { ConnectorSelector } from '../connector_selector/form';
import { ConnectorFieldsForm } from '../connectors/fields_form';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { getConnectorById, getConnectorsFormValidators } from '../utils';
import { useApplicationCapabilities } from '../../common/lib/kibana';
import * as i18n from '../../common/translations';
import { useCasesContext } from '../cases_context/use_cases_context';
import { TemplateFormProps } from '../templates/types';
import { CasesConfigurationUI } from '../../containers/types';

interface Props {
  connectors: ActionConnector[];
  isLoading: boolean;
  path?: string;
  schema: FormSchema<TemplateFormProps>;
  configurationConnector: CasesConfigurationUI['connector'];
}

const ConnectorComponent: React.FC<Props> = ({
  connectors,
  isLoading,
  path,
  schema,
  configurationConnector,
}) => {
  const [{ connectorId }] = useFormData({ watch: ['caseFields.connectorId'] });
  const connector = getConnectorById(connectorId, connectors) ?? null;

  const { actions } = useApplicationCapabilities();
  const { permissions } = useCasesContext();
  const hasReadPermissions = permissions.connectors && actions.read;

  const defaultConnectorId = useMemo(() => {
    return connectors.some((c) => c.id === configurationConnector.id)
      ? configurationConnector.id
      : 'none';
  }, [configurationConnector.id, connectors]);

  const connectorIdConfig = getConnectorsFormValidators({
    config: schema.caseFields?.connectorId as FieldConfig,
    connectors,
  });

  if (!hasReadPermissions) {
    return (
      <EuiText data-test-subj="create-case-connector-permissions-error-msg" size="s">
        <span>{i18n.READ_ACTIONS_PERMISSIONS_ERROR_MSG}</span>
      </EuiText>
    );
  }

  console.log('connector component', {
    defaultConnectorId,
    path,
    connectors,
    connector,
    connectorId,
  });

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <UseField
          path={path ?? 'connectorId'}
          config={connectorIdConfig}
          component={ConnectorSelector}
          defaultValue={defaultConnectorId}
          componentProps={{
            connectors,
            dataTestSubj: 'caseConnectors',
            disabled: isLoading,
            idAria: 'caseConnectors',
            isLoading: isLoading,
            // handleChange: onConnectorChange,
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <ConnectorFieldsForm connector={connector} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ConnectorComponent.displayName = 'ConnectorComponent';

export const Connector = memo(ConnectorComponent);
