/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import type { FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionConnector } from '../../../common/types/domain';
import { ConnectorSelector } from '../connector_selector/form';
import { ConnectorFieldsForm } from '../connectors/fields_form';
import { getConnectorById, getConnectorsFormValidators } from '../utils';
import { useApplicationCapabilities } from '../../common/lib/kibana';
import * as i18n from '../../common/translations';
import { useCasesContext } from '../cases_context/use_cases_context';
import { schema } from './schema';

interface Props {
  connectors: ActionConnector[];
  isLoading: boolean;
  path?: string;
  configurationConnectorId: string;
}

const ConnectorComponent: React.FC<Props> = ({
  connectors,
  isLoading,
  path,
  configurationConnectorId,
}) => {
  const [{ caseFields }] = useFormData({ watch: ['caseFields.connectorId'] });
  const connector = getConnectorById(caseFields?.connectorId, connectors) ?? null;

  const { actions } = useApplicationCapabilities();
  const { permissions } = useCasesContext();
  const hasReadPermissions = permissions.connectors && actions.read;
  const connectorId = schema.caseFields?.connectorId ?? '';

  const connectorIdConfig = getConnectorsFormValidators({
    config: connectorId as FieldConfig,
    connectors,
  });

  if (!hasReadPermissions) {
    return (
      <EuiText data-test-subj="create-case-connector-permissions-error-msg" size="s">
        <span>{i18n.READ_ACTIONS_PERMISSIONS_ERROR_MSG}</span>
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <UseField
          path={path ?? 'connectorId'}
          config={connectorIdConfig}
          component={ConnectorSelector}
          defaultValue={configurationConnectorId}
          componentProps={{
            connectors,
            dataTestSubj: 'caseConnectors',
            disabled: isLoading,
            idAria: 'caseConnectors',
            isLoading,
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <ConnectorFieldsForm path={'caseFields.fields'} connector={connector} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ConnectorComponent.displayName = 'ConnectorComponent';

export const Connector = memo(ConnectorComponent);
