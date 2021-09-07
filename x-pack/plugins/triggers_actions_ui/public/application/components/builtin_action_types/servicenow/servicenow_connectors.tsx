/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';

import { ActionConnectorFieldsProps } from '../../../../types';

import * as i18n from './translations';
import { ServiceNowActionConnector } from './types';
import { useKibana } from '../../../../common/lib/kibana';
import { DeprecatedCallout } from './deprecated_callout';
import { useGetAppInfo } from './use_get_app_info';
import { ApplicationRequiredCallout } from './application_required_callout';
import { isRESTApiError } from './helpers';
import { InstallationCallout } from './installation_callout';
import { MigrationConfirmationModal } from './migration_confirmation_modal';
import { updateActionConnector } from '../../../lib/action_connector_api';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ENABLE_NEW_SN_ITSM_CONNECTOR } from '../../../../../../actions/server/constants/connectors';
import { Credentials } from './credentials';

const ServiceNowConnectorFields: React.FC<
  ActionConnectorFieldsProps<ServiceNowActionConnector>
> = ({
  action,
  editActionSecrets,
  editActionConfig,
  errors,
  consumer,
  readOnly,
  setCallbacks,
  isEdit,
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { apiUrl, isLegacy } = action.config;

  const isApiUrlInvalid: boolean =
    errors.apiUrl !== undefined && errors.apiUrl.length > 0 && apiUrl !== undefined;
  const { username, password } = action.secrets;
  const isUsernameInvalid: boolean =
    errors.username !== undefined && errors.username.length > 0 && username !== undefined;
  const isPasswordInvalid: boolean =
    errors.password !== undefined && errors.password.length > 0 && password !== undefined;

  const hasErrorsOrEmptyFields =
    apiUrl === undefined ||
    username === undefined ||
    password === undefined ||
    isApiUrlInvalid ||
    isUsernameInvalid ||
    isPasswordInvalid;

  const [showModal, setShowModal] = useState(false);

  const { fetchAppInfo, isLoading } = useGetAppInfo({ toastNotifications: toasts });

  const [applicationRequired, setApplicationRequired] = useState<boolean>(false);

  const getApplicationInfo = useCallback(async () => {
    try {
      const res = await fetchAppInfo(action);
      if (isRESTApiError(res)) {
        setApplicationRequired(true);
        return;
      }

      return res;
    } catch (e) {
      // We need to throw here so the connector will be not be saved.
      throw e;
    }
  }, [action, fetchAppInfo]);

  const beforeActionConnectorSave = useCallback(async () => {
    if (ENABLE_NEW_SN_ITSM_CONNECTOR && !isLegacy) {
      await getApplicationInfo();
    }
  }, [getApplicationInfo, isLegacy]);

  const afterActionConnectorSave = useCallback(async () => {
    // TODO: Implement
  }, []);

  useEffect(() => setCallbacks({ beforeActionConnectorSave, afterActionConnectorSave }), [
    afterActionConnectorSave,
    beforeActionConnectorSave,
    setCallbacks,
  ]);

  const onMigrateClick = useCallback(() => setShowModal(true), []);
  const onModalCancel = useCallback(() => setShowModal(false), []);

  const onModalConfirm = useCallback(async () => {
    // TODO: Handle properly
    if (hasErrorsOrEmptyFields) {
      return;
    }

    setShowModal(false);
    await getApplicationInfo();
    await updateActionConnector({
      http,
      connector: {
        name: action.name,
        config: { apiUrl, isLegacy: false },
        secrets: { username, password },
      },
      id: action.id,
    });

    editActionConfig('isLegacy', false);
    toasts.addSuccess({
      title: i18n.MIGRATION_SUCCESS_TOAST_TITLE(action.name),
      text: i18n.MIGRATION_SUCCESS_TOAST_TEXT,
    });
  }, [
    hasErrorsOrEmptyFields,
    getApplicationInfo,
    http,
    action.name,
    action.id,
    apiUrl,
    username,
    password,
    editActionConfig,
    toasts,
  ]);

  return (
    <>
      {showModal && (
        <MigrationConfirmationModal
          url={apiUrl}
          username={username}
          password={password}
          onConfirm={onModalConfirm}
          onCancel={onModalCancel}
          hasErrors={hasErrorsOrEmptyFields}
        />
      )}
      {ENABLE_NEW_SN_ITSM_CONNECTOR && !isLegacy && <InstallationCallout />}
      {ENABLE_NEW_SN_ITSM_CONNECTOR && isLegacy && <DeprecatedCallout onMigrate={onMigrateClick} />}
      <Credentials
        action={action}
        errors={errors}
        readOnly={readOnly}
        isLoading={isLoading}
        editActionSecrets={editActionSecrets}
        editActionConfig={editActionConfig}
      />
      {applicationRequired && <ApplicationRequiredCallout />}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowConnectorFields as default };
