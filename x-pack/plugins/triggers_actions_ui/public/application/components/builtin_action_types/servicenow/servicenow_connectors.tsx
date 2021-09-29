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
import { UpdateConnectorModalComponent } from './update_connector_modal';
import { updateActionConnector } from '../../../lib/action_connector_api';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ENABLE_NEW_SN_ITSM_CONNECTOR } from '../../../../../../actions/server/constants/connectors';
import { Credentials } from './credentials';

const ServiceNowConnectorFields: React.FC<ActionConnectorFieldsProps<ServiceNowActionConnector>> =
  ({
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
    const { username, password } = action.secrets;

    const [showModal, setShowModal] = useState(false);

    const { fetchAppInfo, isLoading } = useGetAppInfo({
      toastNotifications: toasts,
      actionTypeId: action.actionTypeId,
    });

    const [applicationRequired, setApplicationRequired] = useState<boolean>(false);
    const [applicationInfoErrorMsg, setApplicationInfoErrorMsg] = useState<string | null>(null);

    const getApplicationInfo = useCallback(async () => {
      try {
        const res = await fetchAppInfo(action);
        if (isRESTApiError(res)) {
          throw new Error(res.error?.message ?? i18n.UNKNOWN);
        }

        return res;
      } catch (e) {
        setApplicationRequired(true);
        setApplicationInfoErrorMsg(e.message);
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

    useEffect(
      () => setCallbacks({ beforeActionConnectorSave, afterActionConnectorSave }),
      [afterActionConnectorSave, beforeActionConnectorSave, setCallbacks]
    );

    const onMigrateClick = useCallback(() => setShowModal(true), []);
    const onModalCancel = useCallback(() => setShowModal(false), []);

    const onModalConfirm = useCallback(async () => {
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
      setShowModal(false);

      toasts.addSuccess({
        title: i18n.MIGRATION_SUCCESS_TOAST_TITLE(action.name),
        text: i18n.MIGRATION_SUCCESS_TOAST_TEXT,
      });
    }, [
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
          <UpdateConnectorModalComponent
            action={action}
            errors={errors}
            readOnly={readOnly}
            isLoading={isLoading}
            editActionSecrets={editActionSecrets}
            editActionConfig={editActionConfig}
            onConfirm={onModalConfirm}
            onCancel={onModalCancel}
          />
        )}
        {ENABLE_NEW_SN_ITSM_CONNECTOR && !isLegacy && <InstallationCallout />}
        {ENABLE_NEW_SN_ITSM_CONNECTOR && isLegacy && (
          <DeprecatedCallout onMigrate={onMigrateClick} />
        )}
        <Credentials
          action={action}
          errors={errors}
          readOnly={readOnly}
          isLoading={isLoading}
          editActionSecrets={editActionSecrets}
          editActionConfig={editActionConfig}
        />
        {applicationRequired && <ApplicationRequiredCallout message={applicationInfoErrorMsg} />}
      </>
    );
  };

// eslint-disable-next-line import/no-default-export
export { ServiceNowConnectorFields as default };
