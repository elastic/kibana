/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiOverlayMask,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Loading } from '../../../shared/loading';
import { AddRoleMappingButton, RoleMappingsTable } from '../../../shared/role_mapping';
import {
  EMPTY_ROLE_MAPPINGS_TITLE,
  ROLE_MAPPINGS_TITLE,
  ROLE_MAPPINGS_DESCRIPTION,
} from '../../../shared/role_mapping/constants';

import { ROLE_MAPPING_NEW_PATH } from '../../routes';

import {
  ROLE_MAPPINGS_ENGINE_ACCESS_HEADING,
  EMPTY_ROLE_MAPPINGS_BODY,
  ROLE_MAPPINGS_RESET_BUTTON,
  ROLE_MAPPINGS_RESET_CONFIRM_TITLE,
  ROLE_MAPPINGS_RESET_CONFIRM_BUTTON,
  ROLE_MAPPINGS_RESET_CANCEL_BUTTON,
} from './constants';
import { RoleMappingsLogic } from './role_mappings_logic';
import { generateRoleMappingPath } from './utils';

export const RoleMappings: React.FC = () => {
  const { initializeRoleMappings, handleResetMappings, resetState } = useActions(RoleMappingsLogic);
  const { roleMappings, multipleAuthProvidersConfig, dataLoading } = useValues(RoleMappingsLogic);

  useEffect(() => {
    initializeRoleMappings();
    return resetState;
  }, []);

  const [isResetWarningVisible, setResetWarningVisibility] = useState(false);
  const showWarning = () => setResetWarningVisibility(true);
  const hideWarning = () => setResetWarningVisibility(false);

  if (dataLoading) return <Loading />;

  const RESET_MAPPINGS_WARNING_MODAL_BODY = (
    <FormattedMessage
      id="xpack.enterpriseSearch.appSearch.resetMappingsWarningModalBody"
      defaultMessage="{strongText}, and all users who successfully authenticate will be assigned the Owner role and have access to all engines."
      values={{
        strongText: (
          <strong>
            {i18n.translate('xpack.enterpriseSearch.appSearch.resetMappingsWarningModalBodyBold', {
              defaultMessage: 'All role mappings will be deleted',
            })}
          </strong>
        ),
      }}
    />
  );

  const addMappingButton = <AddRoleMappingButton path={ROLE_MAPPING_NEW_PATH} />;

  const roleMappingEmptyState = (
    <EuiPanel paddingSize="l" color="subdued" hasBorder={false}>
      <EuiEmptyPrompt
        iconType="usersRolesApp"
        title={<h2>{EMPTY_ROLE_MAPPINGS_TITLE}</h2>}
        body={<p>{EMPTY_ROLE_MAPPINGS_BODY}</p>}
        actions={addMappingButton}
      />
    </EuiPanel>
  );

  const roleMappingsTable = (
    <RoleMappingsTable
      roleMappings={roleMappings}
      accessItemKey="engines"
      accessHeader={ROLE_MAPPINGS_ENGINE_ACCESS_HEADING}
      addMappingButton={addMappingButton}
      getRoleMappingPath={generateRoleMappingPath}
      shouldShowAuthProvider={multipleAuthProvidersConfig}
    />
  );

  const resetMappings = (
    <EuiButton size="s" color="danger" onClick={showWarning}>
      {ROLE_MAPPINGS_RESET_BUTTON}
    </EuiButton>
  );

  const resetMappingsWarningModal = isResetWarningVisible ? (
    <EuiOverlayMask>
      <EuiConfirmModal
        onCancel={hideWarning}
        onConfirm={() => handleResetMappings(hideWarning)}
        title={ROLE_MAPPINGS_RESET_CONFIRM_TITLE}
        cancelButtonText={ROLE_MAPPINGS_RESET_CANCEL_BUTTON}
        confirmButtonText={ROLE_MAPPINGS_RESET_CONFIRM_BUTTON}
        buttonColor="danger"
        maxWidth={640}
      >
        <p>{RESET_MAPPINGS_WARNING_MODAL_BODY}</p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  ) : null;

  return (
    <>
      <SetPageChrome trail={[ROLE_MAPPINGS_TITLE]} />
      <EuiPageHeader
        rightSideItems={[resetMappings]}
        pageTitle={ROLE_MAPPINGS_TITLE}
        description={ROLE_MAPPINGS_DESCRIPTION}
      />
      <EuiPageContent hasShadow={false} hasBorder={roleMappings.length > 0}>
        <EuiPageContentBody>
          <FlashMessages />
          {roleMappings.length === 0 ? roleMappingEmptyState : roleMappingsTable}
        </EuiPageContentBody>
      </EuiPageContent>
      {resetMappingsWarningModal}
    </>
  );
};
