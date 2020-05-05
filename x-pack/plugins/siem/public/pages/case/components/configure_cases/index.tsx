/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState, Dispatch, SetStateAction } from 'react';
import styled, { css } from 'styled-components';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCallOut,
  EuiBottomBar,
  EuiButtonEmpty,
  EuiText,
} from '@elastic/eui';
import { isEmpty, difference } from 'lodash/fp';
import { useKibana } from '../../../../lib/kibana';
import { useConnectors } from '../../../../containers/case/configure/use_connectors';
import { useCaseConfigure } from '../../../../containers/case/configure/use_configure';
import {
  ActionsConnectorsContextProvider,
  ActionType,
  ConnectorAddFlyout,
  ConnectorEditFlyout,
} from '../../../../../../triggers_actions_ui/public';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionConnectorTableItem } from '../../../../../../triggers_actions_ui/public/types';
import { getCaseUrl } from '../../../../components/link_to';
import { useGetUrlSearch } from '../../../../components/navigation/use_get_url_search';
import { CCMapsCombinedActionAttributes } from '../../../../containers/case/configure/types';
import { connectorsConfiguration } from '../../../../lib/connectors/config';

import { Connectors } from '../configure_cases/connectors';
import { ClosureOptions } from '../configure_cases/closure_options';
import { Mapping } from '../configure_cases/mapping';
import { SectionWrapper } from '../wrappers';
import { navTabs } from '../../../../pages/home/home_navigations';
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
  const search = useGetUrlSearch(navTabs.case);
  const { http, triggers_actions_ui, notifications, application } = useKibana().services;

  const [connectorIsValid, setConnectorIsValid] = useState(true);
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);
  const [editedConnectorItem, setEditedConnectorItem] = useState<ActionConnectorTableItem | null>(
    null
  );

  const [actionBarVisible, setActionBarVisible] = useState(false);
  const [totalConfigurationChanges, setTotalConfigurationChanges] = useState(0);

  const {
    connectorId,
    closureType,
    mapping,
    currentConfiguration,
    loading: loadingCaseConfigure,
    persistLoading,
    persistCaseConfigure,
    setConnector,
    setClosureType,
    setMapping,
  } = useCaseConfigure();

  const { loading: isLoadingConnectors, connectors, refetchConnectors } = useConnectors();

  // ActionsConnectorsContextProvider reloadConnectors prop expects a Promise<void>.
  // TODO: Fix it if reloadConnectors type change.
  const reloadConnectors = useCallback(async () => refetchConnectors(), []);
  const isLoadingAny = isLoadingConnectors || persistLoading || loadingCaseConfigure;
  const updateConnectorDisabled = isLoadingAny || !connectorIsValid || connectorId === 'none';

  const handleSubmit = useCallback(
    // TO DO give a warning/error to user when field are not mapped so they have chance to do it
    () => {
      setActionBarVisible(false);
      persistCaseConfigure({
        connectorId,
        connectorName: connectors.find(c => c.id === connectorId)?.name ?? '',
        closureType,
      });
    },
    [connectorId, connectors, closureType, mapping]
  );

  const onClickAddConnector = useCallback(() => {
    setActionBarVisible(false);
    setAddFlyoutVisibility(true);
  }, []);

  const onClickUpdateConnector = useCallback(() => {
    setActionBarVisible(false);
    setEditFlyoutVisibility(true);
  }, []);

  const handleActionBar = useCallback(() => {
    const currentConfigurationMinusName = {
      connectorId: currentConfiguration.connectorId,
      closureType: currentConfiguration.closureType,
    };
    const unsavedChanges = difference(Object.values(currentConfigurationMinusName), [
      connectorId,
      closureType,
    ]).length;
    setActionBarVisible(!(unsavedChanges === 0));
    setTotalConfigurationChanges(unsavedChanges);
  }, [currentConfiguration, connectorId, closureType]);

  const handleSetAddFlyoutVisibility = useCallback(
    (isVisible: boolean) => {
      handleActionBar();
      setAddFlyoutVisibility(isVisible);
    },
    [currentConfiguration, connectorId, closureType]
  );

  const handleSetEditFlyoutVisibility = useCallback(
    (isVisible: boolean) => {
      handleActionBar();
      setEditFlyoutVisibility(isVisible);
    },
    [currentConfiguration, connectorId, closureType]
  );

  useEffect(() => {
    if (
      !isEmpty(connectors) &&
      connectorId !== 'none' &&
      connectors.some(c => c.id === connectorId)
    ) {
      const myConnector = connectors.find(c => c.id === connectorId);
      const myMapping = myConnector?.config?.casesConfiguration?.mapping ?? [];
      setMapping(
        myMapping.map((m: CCMapsCombinedActionAttributes) => ({
          source: m.source,
          target: m.target,
          actionType: m.action_type ?? m.actionType,
        }))
      );
    }
  }, [connectors, connectorId]);

  useEffect(() => {
    if (
      !isLoadingConnectors &&
      connectorId !== 'none' &&
      !connectors.some(c => c.id === connectorId)
    ) {
      setConnectorIsValid(false);
    } else if (
      !isLoadingConnectors &&
      (connectorId === 'none' || connectors.some(c => c.id === connectorId))
    ) {
      setConnectorIsValid(true);
    }
  }, [connectors, connectorId]);

  useEffect(() => {
    if (!isLoadingConnectors && connectorId !== 'none') {
      setEditedConnectorItem(
        connectors.find(c => c.id === connectorId) as ActionConnectorTableItem
      );
    }
  }, [connectors, connectorId]);

  useEffect(() => {
    handleActionBar();
  }, [
    connectors,
    connectorId,
    closureType,
    currentConfiguration.connectorId,
    currentConfiguration.closureType,
  ]);

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
        <Connectors
          connectors={connectors ?? []}
          disabled={persistLoading || isLoadingConnectors || !userCanCrud}
          isLoading={isLoadingConnectors}
          onChangeConnector={setConnector}
          handleShowAddFlyout={onClickAddConnector}
          selectedConnector={connectorId}
        />
      </SectionWrapper>
      <SectionWrapper>
        <ClosureOptions
          closureTypeSelected={closureType}
          disabled={persistLoading || isLoadingConnectors || connectorId === 'none' || !userCanCrud}
          onChangeClosureType={setClosureType}
        />
      </SectionWrapper>
      <SectionWrapper>
        <Mapping
          disabled
          updateConnectorDisabled={updateConnectorDisabled || !userCanCrud}
          mapping={mapping}
          onChangeMapping={setMapping}
          setEditFlyoutVisibility={onClickUpdateConnector}
        />
      </SectionWrapper>
      {actionBarVisible && (
        <EuiBottomBar data-test-subj="case-configure-action-bottom-bar">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiText data-test-subj="case-configure-action-bottom-bar-total-changes">
                  {i18n.UNSAVED_CHANGES(totalConfigurationChanges)}
                </EuiText>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    color="ghost"
                    iconType="cross"
                    isDisabled={isLoadingAny}
                    isLoading={persistLoading}
                    aria-label={i18n.CANCEL}
                    href={getCaseUrl(search)}
                    data-test-subj="case-configure-action-bottom-bar-cancel-button"
                  >
                    {i18n.CANCEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color="secondary"
                    iconType="save"
                    aria-label={i18n.SAVE_CHANGES}
                    isDisabled={isLoadingAny}
                    isLoading={persistLoading}
                    onClick={handleSubmit}
                    data-test-subj="case-configure-action-bottom-bar-save-button"
                  >
                    {i18n.SAVE_CHANGES}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      )}
      <ActionsConnectorsContextProvider
        value={{
          http,
          actionTypeRegistry: triggers_actions_ui.actionTypeRegistry,
          toastNotifications: notifications.toasts,
          capabilities: application.capabilities,
          reloadConnectors,
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
