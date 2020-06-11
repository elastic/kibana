/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState, Dispatch, SetStateAction } from 'react';
import styled, { css } from 'styled-components';

import { EuiCallOut } from '@elastic/eui';

import { useKibana } from '../../../common/lib/kibana';
import { useConnectors } from '../../containers/configure/use_connectors';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import {
  ActionsConnectorsContextProvider,
  ActionType,
  ConnectorAddFlyout,
  ConnectorEditFlyout,
} from '../../../../../triggers_actions_ui/public';

import { ClosureType } from '../../containers/configure/types';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionConnectorTableItem } from '../../../../../triggers_actions_ui/public/types';
import { connectorsConfiguration } from '../../../common/lib/connectors/config';

import { Connectors } from './connectors';
import { ClosureOptions } from './closure_options';
import { SectionWrapper } from '../wrappers';
import * as i18n from './translations';

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
  `}
`;

const actionTypes: ActionType[] = Object.values(connectorsConfiguration);

interface ConfigureCasesComponentProps {
  userCanCrud: boolean;
}

const ConfigureCasesComponent: React.FC<ConfigureCasesComponentProps> = ({ userCanCrud }) => {
  const { http, triggers_actions_ui, notifications, application, docLinks } = useKibana().services;

  const [connectorIsValid, setConnectorIsValid] = useState(true);
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);
  const [editedConnectorItem, setEditedConnectorItem] = useState<ActionConnectorTableItem | null>(
    null
  );

  const {
    connectorId,
    closureType,
    currentConfiguration,
    loading: loadingCaseConfigure,
    persistLoading,
    version,
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
  const updateConnectorDisabled = isLoadingAny || !connectorIsValid || connectorId === 'none';

  const onClickUpdateConnector = useCallback(() => {
    setEditFlyoutVisibility(true);
  }, []);

  const handleSetAddFlyoutVisibility = useCallback(
    (isVisible: boolean) => {
      setAddFlyoutVisibility(isVisible);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentConfiguration, connectorId, closureType]
  );

  const handleSetEditFlyoutVisibility = useCallback(
    (isVisible: boolean) => {
      setEditFlyoutVisibility(isVisible);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentConfiguration, connectorId, closureType]
  );

  const onChangeConnector = useCallback(
    (id: string) => {
      if (id === 'add-connector') {
        setAddFlyoutVisibility(true);
        return;
      }

      setConnector(id);
      persistCaseConfigure({
        connectorId: id,
        connectorName: connectors.find((c) => c.id === id)?.name ?? '',
        closureType,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connectorId, closureType, version]
  );

  const onChangeClosureType = useCallback(
    (type: ClosureType) => {
      setClosureType(type);
      persistCaseConfigure({
        connectorId,
        connectorName: connectors.find((c) => c.id === connectorId)?.name ?? '',
        closureType: type,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connectorId, closureType, version]
  );

  useEffect(() => {
    if (
      !isLoadingConnectors &&
      connectorId !== 'none' &&
      !connectors.some((c) => c.id === connectorId)
    ) {
      setConnectorIsValid(false);
    } else if (
      !isLoadingConnectors &&
      (connectorId === 'none' || connectors.some((c) => c.id === connectorId))
    ) {
      setConnectorIsValid(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectors, connectorId]);

  useEffect(() => {
    if (!isLoadingConnectors && connectorId !== 'none') {
      setEditedConnectorItem(
        connectors.find((c) => c.id === connectorId) as ActionConnectorTableItem
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectors, connectorId]);

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
          isLoading={isLoadingConnectors}
          onChangeConnector={onChangeConnector}
          updateConnectorDisabled={updateConnectorDisabled || !userCanCrud}
          handleShowEditFlyout={onClickUpdateConnector}
          selectedConnector={connectorId}
        />
      </SectionWrapper>
      <ActionsConnectorsContextProvider
        value={{
          http,
          actionTypeRegistry: triggers_actions_ui.actionTypeRegistry,
          toastNotifications: notifications.toasts,
          capabilities: application.capabilities,
          reloadConnectors,
          docLinks,
          consumer: 'case',
        }}
      >
        <ConnectorAddFlyout
          addFlyoutVisible={addFlyoutVisible}
          setAddFlyoutVisibility={handleSetAddFlyoutVisibility as Dispatch<SetStateAction<boolean>>}
          actionTypes={actionTypes}
        />
        {editedConnectorItem && (
          <ConnectorEditFlyout
            key={editedConnectorItem.id}
            initialConnector={editedConnectorItem}
            editFlyoutVisible={editFlyoutVisible}
            setEditFlyoutVisibility={
              handleSetEditFlyoutVisibility as Dispatch<SetStateAction<boolean>>
            }
          />
        )}
      </ActionsConnectorsContextProvider>
    </FormWrapper>
  );
};

export const ConfigureCases = React.memo(ConfigureCasesComponent);
