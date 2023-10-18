/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import React, { useCallback, useState } from 'react';
import { EuiText, EuiHorizontalRule, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';

import type { CaseUI, CaseConnectors } from '../../../common/ui/types';
import type { ActionConnector, CaseConnector } from '../../../common/types/domain';
import * as i18n from './translations';
import { getConnectorById } from '../utils';
import { usePushToService } from '../use_push_to_service';
import { useApplicationCapabilities } from '../../common/lib/kibana';
import { PushButton } from './push_button';
import { PushCallouts } from './push_callouts';
import { ConnectorsForm } from './connectors_form';
import { ConnectorFieldsPreviewForm } from '../connectors/fields_preview_form';
import { useCasesContext } from '../cases_context/use_cases_context';

export interface EditConnectorProps {
  caseData: CaseUI;
  caseConnectors: CaseConnectors;
  supportedActionConnectors: ActionConnector[];
  isLoading: boolean;
  onSubmit: (connector: CaseConnector) => void;
}

export const EditConnector = React.memo(
  ({
    caseData,
    caseConnectors,
    supportedActionConnectors,
    isLoading,
    onSubmit,
  }: EditConnectorProps) => {
    const caseConnectorFields = caseData.connector.fields;
    const caseActionConnector = getConnectorById(caseData.connector.id, supportedActionConnectors);
    const isValidConnector = !!caseActionConnector;

    const [isEdit, setIsEdit] = useState(false);

    const { actions } = useApplicationCapabilities();
    const { permissions } = useCasesContext();
    const canUseConnectors = permissions.connectors && actions.read;

    const onEditClick = useCallback(() => setIsEdit(true), []);
    const onCancelConnector = useCallback(() => setIsEdit(false), []);

    const onSubmitConnector = useCallback(
      (connector: CaseConnector) => {
        onSubmit(connector);
        setIsEdit(false);
      },
      [onSubmit]
    );

    const connectorWithName = {
      ...caseData.connector,
      name: isEmpty(caseActionConnector?.name)
        ? caseData.connector.name
        : caseActionConnector?.name ?? '',
    };

    const {
      errorsMsg,
      needsToBePushed,
      hasBeenPushed,
      isLoading: isLoadingPushToService,
      hasPushPermissions,
      hasErrorMessages,
      hasLicenseError,
      handlePushToService,
    } = usePushToService({
      connector: connectorWithName,
      caseConnectors,
      caseId: caseData.id,
      caseStatus: caseData.status,
      isValidConnector,
    });

    const disablePushButton =
      isLoadingPushToService ||
      errorsMsg.length > 0 ||
      !hasPushPermissions ||
      !isValidConnector ||
      !needsToBePushed;

    return (
      <EuiFlexItem grow={false} data-test-subj="sidebar-connectors">
        <EuiText>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="xs"
            justifyContent="spaceBetween"
            responsive={false}
            data-test-subj="case-view-edit-connector"
          >
            <EuiFlexItem grow={false} data-test-subj="connector-edit-header">
              <h4>{i18n.CONNECTORS}</h4>
            </EuiFlexItem>
            {!isLoading && !isEdit && hasPushPermissions && canUseConnectors ? (
              <EuiFlexItem data-test-subj="connector-edit" grow={false}>
                <EuiButtonIcon
                  data-test-subj="connector-edit-button"
                  aria-label={i18n.EDIT_CONNECTOR_ARIA}
                  iconType="pencil"
                  onClick={onEditClick}
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          <EuiHorizontalRule margin="xs" />
          <EuiFlexGroup data-test-subj="edit-connectors" direction="column" alignItems="stretch">
            {!isLoading && !isEdit && hasErrorMessages && canUseConnectors && (
              <EuiFlexItem data-test-subj="push-callouts">
                <PushCallouts
                  errorsMsg={errorsMsg}
                  hasLicenseError={hasLicenseError}
                  hasConnectors={supportedActionConnectors.length > 0}
                  onEditClick={onEditClick}
                />
              </EuiFlexItem>
            )}
            {!canUseConnectors && (
              <EuiText data-test-subj="edit-connector-permissions-error-msg" size="s">
                <span>{i18n.READ_ACTIONS_PERMISSIONS_ERROR_MSG}</span>
              </EuiText>
            )}
            {canUseConnectors && !isEdit && (
              <ConnectorFieldsPreviewForm
                connector={caseActionConnector}
                fields={caseConnectorFields}
              />
            )}
            {canUseConnectors && isEdit && (
              <ConnectorsForm
                caseData={caseData}
                caseConnectors={caseConnectors}
                supportedActionConnectors={supportedActionConnectors}
                isLoading={isLoading}
                onCancel={onCancelConnector}
                onSubmit={onSubmitConnector}
              />
            )}
            {!hasErrorMessages && !isLoading && !isEdit && hasPushPermissions && canUseConnectors && (
              <EuiFlexItem grow={false}>
                <span>
                  <PushButton
                    hasBeenPushed={hasBeenPushed}
                    disabled={disablePushButton}
                    isLoading={isLoadingPushToService}
                    pushToService={handlePushToService}
                    errorsMsg={errorsMsg}
                    showTooltip={errorsMsg.length > 0 || !needsToBePushed || !hasPushPermissions}
                    connectorName={connectorWithName.name}
                  />
                </span>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiText>
      </EuiFlexItem>
    );
  }
);

EditConnector.displayName = 'EditConnector';
