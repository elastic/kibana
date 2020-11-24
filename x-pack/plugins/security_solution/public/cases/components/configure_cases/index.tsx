/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { css } from 'styled-components';

import { EuiCallOut } from '@elastic/eui';

import { useKibana } from '../../../common/lib/kibana';
import { useConnectors } from '../../containers/configure/use_connectors';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import { ActionType } from '../../../../../triggers_actions_ui/public';

import { ClosureType } from '../../containers/configure/types';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionConnectorTableItem } from '../../../../../triggers_actions_ui/public/types';
import { connectorsConfiguration } from '../../../common/lib/connectors/config';

import { SectionWrapper } from '../wrappers';
import { Connectors } from './connectors';
import { ClosureOptions } from './closure_options';
import {
  getConnectorById,
  getNoneConnector,
  normalizeActionConnector,
  normalizeCaseConnector,
} from './utils';
import * as i18n from './translations';
import { FieldMappingFlyout } from './field_mapping_flyout';

const FormWrapper = styled.div`
  ${({ theme }) => css`
    & > * {
      margin-top 40px;
    }

    & > :first-child {
      margin-top: 0;
    }

    padding-top: ${theme.eui.paddingSizes.xl};
    padding-bottom: ${theme.eui.paddingSizes.xl};
    .euiFlyout {
      z-index: ${theme.eui.euiZNavigation + 1};
    }
  `}
`;

const actionTypes: ActionType[] = Object.values(connectorsConfiguration);

interface ConfigureCasesComponentProps {
  userCanCrud: boolean;
}

const ConfigureCasesComponent: React.FC<ConfigureCasesComponentProps> = ({ userCanCrud }) => {
  const { triggersActionsUi } = useKibana().services;

  const [connectorIsValid, setConnectorIsValid] = useState(true);
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);
  const [mappingsFlyoutVisible, setMappingsFlyoutVisibility] = useState<boolean>(false);
  const [editedConnectorItem, setEditedConnectorItem] = useState<ActionConnectorTableItem | null>(
    null
  );

  const {
    connector,
    closureType,
    loading: loadingCaseConfigure,
    mappings,
    persistLoading,
    persistCaseConfigure,
    setConnector,
    setClosureType,
  } = useCaseConfigure();

  const { loading: isLoadingConnectors, connectors, refetchConnectors } = useConnectors();

  // ActionsConnectorsContextProvider reloadConnectors prop expects a Promise<void>.
  // TODO: Fix it if reloadConnectors type change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reloadConnectors = useCallback(async () => refetchConnectors(), []);
  const isLoadingAny = isLoadingConnectors || persistLoading || loadingCaseConfigure;
  const updateConnectorDisabled = isLoadingAny || !connectorIsValid || connector.id === 'none';
  const onClickUpdateMappings = useCallback(() => {
    setMappingsFlyoutVisibility(true);
  }, []);
  const onCloseUpdateMappings = useCallback(() => {
    setMappingsFlyoutVisibility(false);
  }, []);
  const onClickUpdateConnector = useCallback(() => {
    setEditFlyoutVisibility(true);
  }, []);

  const onCloseAddFlyout = useCallback(() => setAddFlyoutVisibility(false), [
    setAddFlyoutVisibility,
  ]);

  const onCloseEditFlyout = useCallback(() => setEditFlyoutVisibility(false), [
    setEditFlyoutVisibility,
  ]);

  const onChangeConnector = useCallback(
    (id: string) => {
      if (id === 'add-connector') {
        setAddFlyoutVisibility(true);
        return;
      }

      const actionConnector = getConnectorById(id, connectors);
      const caseConnector =
        actionConnector != null ? normalizeActionConnector(actionConnector) : getNoneConnector();

      setConnector(caseConnector);
      persistCaseConfigure({
        connector: caseConnector,
        closureType,
      });
    },
    [connectors, closureType, persistCaseConfigure, setConnector]
  );

  const onChangeClosureType = useCallback(
    (type: ClosureType) => {
      setClosureType(type);
      persistCaseConfigure({
        connector,
        closureType: type,
      });
    },
    [connector, persistCaseConfigure, setClosureType]
  );

  useEffect(() => {
    if (
      !isLoadingConnectors &&
      connector.id !== 'none' &&
      !connectors.some((c) => c.id === connector.id)
    ) {
      setConnectorIsValid(false);
    } else if (
      !isLoadingConnectors &&
      (connector.id === 'none' || connectors.some((c) => c.id === connector.id))
    ) {
      setConnectorIsValid(true);
    }
  }, [connectors, connector, isLoadingConnectors]);

  useEffect(() => {
    if (!isLoadingConnectors && connector.id !== 'none') {
      setEditedConnectorItem(
        normalizeCaseConnector(connectors, connector) as ActionConnectorTableItem
      );
    }
  }, [connectors, connector, isLoadingConnectors]);

  const ConnectorAddFlyout = useMemo(
    () =>
      triggersActionsUi.getAddConnectorFlyout({
        consumer: 'case',
        onClose: onCloseAddFlyout,
        actionTypes,
        reloadConnectors,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const ConnectorEditFlyout = useMemo(
    () =>
      editedConnectorItem && editFlyoutVisible
        ? triggersActionsUi.getEditConnectorFlyout({
            initialConnector: editedConnectorItem,
            consumer: 'case',
            onClose: onCloseEditFlyout,
            reloadConnectors,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connector.id, editFlyoutVisible]
  );

  return (
    <FormWrapper>
      {!connectorIsValid && (
        <SectionWrapper style={{ marginTop: 0 }}>
          <EuiCallOut
            title={i18n.WARNING_NO_CONNECTOR_TITLE}
            color="warning"
            iconType="help"
            data-test-subj="configure-cases-warning-callout"
          >
            {i18n.WARNING_NO_CONNECTOR_MESSAGE}
          </EuiCallOut>
        </SectionWrapper>
      )}
      <SectionWrapper>
        <ClosureOptions
          closureTypeSelected={closureType}
          disabled={persistLoading || isLoadingConnectors || !userCanCrud}
          onChangeClosureType={onChangeClosureType}
        />
      </SectionWrapper>
      <SectionWrapper>
        <Connectors
          connectors={connectors ?? []}
          disabled={persistLoading || isLoadingConnectors || !userCanCrud}
          handleShowEditFlyout={onClickUpdateConnector}
          isLoading={isLoadingAny}
          mappings={mappings}
          onChangeConnector={onChangeConnector}
          onClickUpdateMappings={onClickUpdateMappings}
          selectedConnector={connector}
          updateConnectorDisabled={updateConnectorDisabled || !userCanCrud}
        />
      </SectionWrapper>
      {addFlyoutVisible && ConnectorAddFlyout}
      {ConnectorEditFlyout}
      {mappingsFlyoutVisible && editedConnectorItem != null && (
        <FieldMappingFlyout onClose={onCloseUpdateMappings} connector={editedConnectorItem} />
      )}
    </FormWrapper>
  );
};

export const ConfigureCases = React.memo(ConfigureCasesComponent);
