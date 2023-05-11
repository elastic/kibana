/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import type { FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionConnector } from '../../../common/api';
import { ConnectorSelector } from '../connector_selector/form';
import { ConnectorFieldsForm } from '../connectors/fields_form';
import { schema } from './schema';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import { getConnectorById, getConnectorsFormValidators } from '../utils';
import { useApplicationCapabilities } from '../../common/lib/kibana';
import * as i18n from '../../common/translations';

interface Props {
  connectors: ActionConnector[];
  isLoading: boolean;
  isLoadingConnectors: boolean;
}

const ConnectorComponent: React.FC<Props> = ({ connectors, isLoading, isLoadingConnectors }) => {
  const [{ connectorId }] = useFormData({ watch: ['connectorId'] });
  const connector = getConnectorById(connectorId, connectors) ?? null;
  const { connector: configurationConnector } = useCaseConfigure();
  const { actions } = useApplicationCapabilities();

  const defaultConnectorId = useMemo(() => {
    return connectors.some((c) => c.id === configurationConnector.id)
      ? configurationConnector.id
      : 'none';
  }, [configurationConnector.id, connectors]);

  const connectorIdConfig = getConnectorsFormValidators({
    config: schema.connectorId as FieldConfig,
    connectors,
  });

  if (!actions.read) {
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
          path="connectorId"
          config={connectorIdConfig}
          component={ConnectorSelector}
          defaultValue={defaultConnectorId}
          componentProps={{
            connectors,
            dataTestSubj: 'caseConnectors',
            disabled: isLoading || isLoadingConnectors,
            idAria: 'caseConnectors',
            isLoading: isLoading || isLoadingConnectors,
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
