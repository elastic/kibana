/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { css } from 'styled-components';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink } from '@elastic/eui';

import type { ActionConnectorTableItem } from '@kbn/triggers-actions-ui-plugin/public/types';
import { CasesConnectorFeatureId } from '@kbn/actions-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { useGetActionTypes } from '../../containers/configure/use_action_types';
import { useCaseConfigure } from '../../containers/configure/use_configure';

import type { ClosureType } from '../../containers/configure/types';

import { SectionWrapper, ContentWrapper, WhitePageWrapper } from '../wrappers';
import { Connectors } from './connectors';
import { ClosureOptions } from './closure_options';
import { getNoneConnector, normalizeActionConnector, normalizeCaseConnector } from './utils';
import * as i18n from './translations';
import { getConnectorById } from '../utils';
import { HeaderPage } from '../header_page';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesBreadcrumbs } from '../use_breadcrumbs';
import { CasesDeepLinkId } from '../../common/navigation';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';

const FormWrapper = styled.div`
  ${({ theme }) => css`
    & > * {
      margin-top 40px;
    }

    & > :first-child {
      margin-top: 0;
    }

    padding-top: ${theme.eui.euiSizeXL};
    padding-bottom: ${theme.eui.euiSizeXL};
    .euiFlyout {
      z-index: ${theme.eui.euiZNavigation + 1};
    }
  `}
`;

export const ConfigureCases: React.FC = React.memo(() => {
  const { permissions } = useCasesContext();
  const { triggersActionsUi } = useKibana().services;
  useCasesBreadcrumbs(CasesDeepLinkId.casesConfigure);

  const [connectorIsValid, setConnectorIsValid] = useState(true);
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);
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
    refetchCaseConfigure,
    setConnector,
    setClosureType,
  } = useCaseConfigure();

  const {
    isLoading: isLoadingConnectors,
    data: connectors = [],
    refetch: refetchConnectors,
  } = useGetSupportedActionConnectors();
  const {
    isLoading: isLoadingActionTypes,
    data: actionTypes = [],
    refetch: refetchActionTypes,
  } = useGetActionTypes();

  const onConnectorUpdated = useCallback(async () => {
    refetchConnectors();
    refetchActionTypes();
    refetchCaseConfigure();
  }, [refetchActionTypes, refetchCaseConfigure, refetchConnectors]);

  const isLoadingAny =
    isLoadingConnectors || persistLoading || loadingCaseConfigure || isLoadingActionTypes;
  const updateConnectorDisabled = isLoadingAny || !connectorIsValid || connector.id === 'none';
  const onClickUpdateConnector = useCallback(() => {
    setEditFlyoutVisibility(true);
  }, []);

  const onCloseAddFlyout = useCallback(
    () => setAddFlyoutVisibility(false),
    [setAddFlyoutVisibility]
  );

  const onCloseEditFlyout = useCallback(() => setEditFlyoutVisibility(false), []);

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
      addFlyoutVisible
        ? triggersActionsUi.getAddConnectorFlyout({
            onClose: onCloseAddFlyout,
            featureId: CasesConnectorFeatureId,
            onConnectorCreated: onConnectorUpdated,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addFlyoutVisible]
  );

  const ConnectorEditFlyout = useMemo(
    () =>
      editedConnectorItem && editFlyoutVisible
        ? triggersActionsUi.getEditConnectorFlyout({
            connector: editedConnectorItem,
            onClose: onCloseEditFlyout,
            onConnectorUpdated,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connector.id, editFlyoutVisible]
  );

  return (
    <>
      <HeaderPage
        showBackButton={true}
        data-test-subj="case-configure-title"
        title={i18n.CONFIGURE_CASES_PAGE_TITLE}
      />
      <WhitePageWrapper>
        <ContentWrapper>
          <FormWrapper>
            {!connectorIsValid && (
              <SectionWrapper style={{ marginTop: 0 }}>
                <EuiCallOut
                  title={i18n.WARNING_NO_CONNECTOR_TITLE}
                  color="warning"
                  iconType="help"
                  data-test-subj="configure-cases-warning-callout"
                >
                  <FormattedMessage
                    defaultMessage="The selected connector has been deleted or you do not have the {appropriateLicense} to use it. Either select a different connector or create a new one."
                    id="xpack.cases.configure.connectorDeletedOrLicenseWarning"
                    values={{
                      appropriateLicense: (
                        <EuiLink href="https://www.elastic.co/subscriptions" target="_blank">
                          {i18n.LINK_APPROPRIATE_LICENSE}
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiCallOut>
              </SectionWrapper>
            )}
            <SectionWrapper>
              <ClosureOptions
                closureTypeSelected={closureType}
                disabled={persistLoading || isLoadingConnectors || !permissions.update}
                onChangeClosureType={onChangeClosureType}
              />
            </SectionWrapper>
            <SectionWrapper>
              <Connectors
                actionTypes={actionTypes}
                connectors={connectors ?? []}
                disabled={persistLoading || isLoadingConnectors || !permissions.update}
                handleShowEditFlyout={onClickUpdateConnector}
                isLoading={isLoadingAny}
                mappings={mappings}
                onChangeConnector={onChangeConnector}
                selectedConnector={connector}
                updateConnectorDisabled={updateConnectorDisabled || !permissions.update}
              />
            </SectionWrapper>
            {ConnectorAddFlyout}
            {ConnectorEditFlyout}
          </FormWrapper>
        </ContentWrapper>
      </WhitePageWrapper>
    </>
  );
});

ConfigureCases.displayName = 'ConfigureCases';
