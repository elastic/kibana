/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiCallOut,
  EuiFlexItem,
  EuiLink,
  EuiPageBody,
  EuiPageSection,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';

import type { ActionConnectorTableItem } from '@kbn/triggers-actions-ui-plugin/public/types';
import { CasesConnectorFeatureId } from '@kbn/actions-plugin/common';
import type {
  CustomFieldConfiguration,
  CustomFieldsConfiguration,
  TemplateConfiguration,
} from '../../../common/types/domain';
import { useKibana } from '../../common/lib/kibana';
import { useGetActionTypes } from '../../containers/configure/use_action_types';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';

import type { ClosureType } from '../../containers/configure/types';
import { Connectors } from './connectors';
import { ClosureOptions } from './closure_options';
import { getNoneConnector, normalizeActionConnector, normalizeCaseConnector } from './utils';
import * as i18n from './translations';
import { getConnectorById, addOrReplaceField } from '../utils';
import { HeaderPage } from '../header_page';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesBreadcrumbs } from '../use_breadcrumbs';
import { CasesDeepLinkId } from '../../common/navigation';
import { CustomFields } from '../custom_fields';
import { CommonFlyout } from './flyout';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { usePersistConfiguration } from '../../containers/configure/use_persist_configuration';
import { transformCustomFieldsData } from '../custom_fields/utils';
import { useLicense } from '../../common/use_license';
import { Templates } from '../templates';
import type { TemplateFormProps } from '../templates/types';

const sectionWrapperCss = css`
  box-sizing: content-box;
  max-width: 1175px;
  width: 100%;
`;

const getFormWrapperCss = (euiTheme: EuiThemeComputed<{}>) => css`
  padding-top: ${euiTheme.size.xl};
  padding-bottom: ${euiTheme.size.xl};
  .euiFlyout {
    z-index: ${Number(euiTheme.levels.navigation) + 1};
  }
`;

interface Flyout {
  type: 'addConnector' | 'editConnector' | 'customField' | 'template';
  visible: boolean;
}

export const ConfigureCases: React.FC = React.memo(() => {
  const { permissions } = useCasesContext();
  const { triggersActionsUi } = useKibana().services;
  useCasesBreadcrumbs(CasesDeepLinkId.casesConfigure);
  const license = useLicense();
  const hasMinimumLicensePermissions = license.isAtLeastGold();

  const [connectorIsValid, setConnectorIsValid] = useState(true);
  const [flyOutVisibility, setFlyOutVisibility] = useState<Flyout | null>(null);
  const [editedConnectorItem, setEditedConnectorItem] = useState<ActionConnectorTableItem | null>(
    null
  );
  const [customFieldToEdit, setCustomFieldToEdit] = useState<CustomFieldConfiguration | null>(null);
  const [templateToEdit, setTemplateToEdit] = useState<TemplateConfiguration | null>(null);
  const { euiTheme } = useEuiTheme();
  const flyoutType =
    flyOutVisibility?.type === 'customField' && flyOutVisibility?.visible
      ? 'customField'
      : flyOutVisibility?.type === 'template' && flyOutVisibility?.visible
      ? 'template'
      : null;

  const {
    data: {
      id: configurationId,
      version: configurationVersion,
      closureType,
      connector,
      mappings,
      customFields,
      templates,
    },
    isLoading: loadingCaseConfigure,
    refetch: refetchCaseConfigure,
  } = useGetCaseConfiguration();

  const {
    mutate: persistCaseConfigure,
    mutateAsync: persistCaseConfigureAsync,
    isLoading: isPersistingConfiguration,
  } = usePersistConfiguration();

  const isLoadingCaseConfiguration = loadingCaseConfigure || isPersistingConfiguration;

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

  const onConnectorUpdated = useCallback(
    async (updatedConnector) => {
      setEditedConnectorItem(updatedConnector);
      refetchConnectors();
      refetchActionTypes();
      refetchCaseConfigure();
    },
    [refetchActionTypes, refetchCaseConfigure, refetchConnectors, setEditedConnectorItem]
  );

  const onConnectorCreated = useCallback(
    async (createdConnector) => {
      const caseConnector = normalizeActionConnector(createdConnector);

      await persistCaseConfigureAsync({
        connector: caseConnector,
        closureType,
        customFields,
        templates,
        id: configurationId,
        version: configurationVersion,
      });

      onConnectorUpdated(createdConnector);
    },
    [
      persistCaseConfigureAsync,
      closureType,
      customFields,
      templates,
      configurationId,
      configurationVersion,
      onConnectorUpdated,
    ]
  );

  const isLoadingAny =
    isLoadingConnectors ||
    isPersistingConfiguration ||
    loadingCaseConfigure ||
    isLoadingActionTypes;
  const updateConnectorDisabled = isLoadingAny || !connectorIsValid || connector.id === 'none';
  const onClickUpdateConnector = useCallback(() => {
    setFlyOutVisibility({ type: 'editConnector', visible: true });
  }, []);

  const onCloseAddFlyout = useCallback(
    () => setFlyOutVisibility({ type: 'addConnector', visible: false }),
    [setFlyOutVisibility]
  );

  const onCloseEditFlyout = useCallback(
    () => setFlyOutVisibility({ type: 'editConnector', visible: false }),
    []
  );

  const onChangeConnector = useCallback(
    (id: string) => {
      if (id === 'add-connector') {
        setFlyOutVisibility({ type: 'addConnector', visible: true });
        return;
      }

      const actionConnector = getConnectorById(id, connectors);
      const caseConnector =
        actionConnector != null ? normalizeActionConnector(actionConnector) : getNoneConnector();

      persistCaseConfigure({
        connector: caseConnector,
        closureType,
        customFields,
        templates,
        id: configurationId,
        version: configurationVersion,
      });
    },
    [
      connectors,
      persistCaseConfigure,
      closureType,
      customFields,
      templates,
      configurationId,
      configurationVersion,
    ]
  );

  const onChangeClosureType = useCallback(
    (type: ClosureType) => {
      persistCaseConfigure({
        connector,
        customFields,
        templates,
        id: configurationId,
        version: configurationVersion,
        closureType: type,
      });
    },
    [
      configurationId,
      configurationVersion,
      connector,
      customFields,
      templates,
      persistCaseConfigure,
    ]
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
      flyOutVisibility?.type === 'addConnector' && flyOutVisibility?.visible
        ? triggersActionsUi.getAddConnectorFlyout({
            onClose: onCloseAddFlyout,
            featureId: CasesConnectorFeatureId,
            onConnectorCreated,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flyOutVisibility]
  );

  const ConnectorEditFlyout = useMemo(
    () =>
      editedConnectorItem && flyOutVisibility?.type === 'editConnector' && flyOutVisibility?.visible
        ? triggersActionsUi.getEditConnectorFlyout({
            connector: editedConnectorItem,
            onClose: onCloseEditFlyout,
            onConnectorUpdated,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connector.id, editedConnectorItem, flyOutVisibility]
  );

  const onDeleteCustomField = useCallback(
    (key: string) => {
      const remainingCustomFields = customFields.filter((field) => field.key !== key);

      persistCaseConfigure({
        connector,
        customFields: [...remainingCustomFields],
        templates,
        id: configurationId,
        version: configurationVersion,
        closureType,
      });
    },
    [
      closureType,
      configurationId,
      configurationVersion,
      connector,
      customFields,
      templates,
      persistCaseConfigure,
    ]
  );

  const onEditCustomField = useCallback(
    (key: string) => {
      const selectedCustomField = customFields.find((item) => item.key === key);

      if (selectedCustomField) {
        setCustomFieldToEdit(selectedCustomField);
      }
      setFlyOutVisibility({ type: 'customField', visible: true });
    },
    [setFlyOutVisibility, setCustomFieldToEdit, customFields]
  );

  const onCloseAddFieldFlyout = useCallback(() => {
    setFlyOutVisibility({ type: 'customField', visible: false });
    setCustomFieldToEdit(null);
  }, [setFlyOutVisibility, setCustomFieldToEdit]);

  const onFlyoutSave = useCallback(
    (data: CustomFieldConfiguration | TemplateFormProps | null | {}) => {
      if (flyoutType === 'customField') {
        const updatedCustomFields = addOrReplaceField(
          customFields,
          data as CustomFieldConfiguration
        );

        persistCaseConfigure({
          connector,
          customFields: updatedCustomFields as CustomFieldsConfiguration,
          templates,
          id: configurationId,
          version: configurationVersion,
          closureType,
        });

        setFlyOutVisibility({ type: 'customField', visible: false });
        setCustomFieldToEdit(null);

        return;
      }

      if (flyoutType === 'template') {
        const { caseFields, ...rest } = data as TemplateFormProps;
        const {
          connectorId,
          fields,
          customFields: templateCustomFields,
          syncAlerts = false,
          ...otherCaseFields
        } = caseFields ?? {};
        const transformedCustomFields = templateCustomFields
          ? transformCustomFieldsData(templateCustomFields, customFields)
          : [];
        const templateConnector = connectorId ? getConnectorById(connectorId, connectors) : null;

        const transformedConnector = templateConnector
          ? normalizeActionConnector(templateConnector, fields)
          : getNoneConnector();

        const transformedData: TemplateConfiguration = {
          ...rest,
          caseFields: {
            ...otherCaseFields,
            connector: transformedConnector,
            customFields: transformedCustomFields,
            settings: { syncAlerts },
          },
        };
        const updatedTemplates = addOrReplaceField(templates, transformedData);

        persistCaseConfigure({
          connector,
          customFields,
          templates: updatedTemplates,
          id: configurationId,
          version: configurationVersion,
          closureType,
        });

        setFlyOutVisibility({ type: 'template', visible: false });
        setTemplateToEdit(null);
      }
    },
    [
      closureType,
      configurationId,
      configurationVersion,
      connector,
      connectors,
      customFields,
      templates,
      persistCaseConfigure,
      flyoutType,
    ]
  );

  const AddOrEditFlyout =
    flyOutVisibility !== null && flyoutType !== null ? (
      <CommonFlyout
        isLoading={loadingCaseConfigure || isPersistingConfiguration}
        disabled={
          !permissions.create ||
          !permissions.update ||
          loadingCaseConfigure ||
          isPersistingConfiguration
        }
        type={flyoutType}
        data={flyoutType === 'template' ? templateToEdit : customFieldToEdit}
        connectors={connectors ?? []}
        configurationConnector={connector}
        onCloseFlyout={onCloseAddFieldFlyout}
        onSaveField={onFlyoutSave}
      />
    ) : null;

  return (
    <EuiPageSection restrictWidth={true}>
      <HeaderPage
        showBackButton={true}
        data-test-subj="case-configure-title"
        title={i18n.CONFIGURE_CASES_PAGE_TITLE}
      />
      <EuiPageBody restrictWidth={true}>
        <div css={getFormWrapperCss(euiTheme)}>
          {hasMinimumLicensePermissions && (
            <>
              {!connectorIsValid && (
                <>
                  <div css={sectionWrapperCss}>
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
                  </div>
                  <EuiSpacer size="xl" />
                </>
              )}
              <div css={sectionWrapperCss}>
                <ClosureOptions
                  closureTypeSelected={closureType}
                  disabled={isPersistingConfiguration || isLoadingConnectors || !permissions.update}
                  onChangeClosureType={onChangeClosureType}
                />
              </div>
              <EuiSpacer size="xl" />
              <div css={sectionWrapperCss}>
                <Connectors
                  actionTypes={actionTypes}
                  connectors={connectors ?? []}
                  disabled={isPersistingConfiguration || isLoadingConnectors || !permissions.update}
                  handleShowEditFlyout={onClickUpdateConnector}
                  isLoading={isLoadingAny}
                  mappings={mappings}
                  onChangeConnector={onChangeConnector}
                  selectedConnector={connector}
                  updateConnectorDisabled={updateConnectorDisabled || !permissions.update}
                />
              </div>
              <EuiSpacer size="xl" />
            </>
          )}
          <div css={sectionWrapperCss}>
            <EuiFlexItem grow={false}>
              <CustomFields
                customFields={customFields}
                isLoading={isLoadingCaseConfiguration}
                disabled={isLoadingCaseConfiguration}
                handleAddCustomField={() =>
                  setFlyOutVisibility({ type: 'customField', visible: true })
                }
                handleDeleteCustomField={onDeleteCustomField}
                handleEditCustomField={onEditCustomField}
              />
            </EuiFlexItem>
          </div>

          <EuiSpacer size="xl" />

          <div css={sectionWrapperCss}>
            <EuiFlexItem grow={false}>
              <Templates
                templates={templates}
                isLoading={isLoadingCaseConfiguration}
                disabled={isLoadingCaseConfiguration}
                handleAddTemplate={() => setFlyOutVisibility({ type: 'template', visible: true })}
              />
            </EuiFlexItem>
          </div>
          <EuiSpacer size="xl" />
          {ConnectorAddFlyout}
          {ConnectorEditFlyout}
          {AddOrEditFlyout}
        </div>
      </EuiPageBody>
    </EuiPageSection>
  );
});

ConfigureCases.displayName = 'ConfigureCases';
