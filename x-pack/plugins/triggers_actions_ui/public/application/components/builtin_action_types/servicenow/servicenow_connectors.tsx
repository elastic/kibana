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
import { isRESTApiError, isLegacyConnector } from './helpers';
import { InstallationCallout } from './installation_callout';
import { UpdateConnector } from './update_connector';
import { updateActionConnector } from '../../../lib/action_connector_api';
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
    const { apiUrl } = action.config;
    const { username, password } = action.secrets;
    const isOldConnector = isLegacyConnector(action);

    const [showModal, setShowModal] = useState(false);

    const { fetchAppInfo, isLoading } = useGetAppInfo({
      actionTypeId: action.actionTypeId,
    });

    const [applicationRequired, setApplicationRequired] = useState<boolean>(false);
    const [applicationInfoErrorMsg, setApplicationInfoErrorMsg] = useState<string | null>(null);

    const getApplicationInfo = useCallback(async () => {
      setApplicationRequired(false);
      setApplicationInfoErrorMsg(null);

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
      if (!isOldConnector) {
        await getApplicationInfo();
      }
    }, [getApplicationInfo, isOldConnector]);

    useEffect(() => {
      if (setCallbacks) {
        setCallbacks({ beforeActionConnectorSave });
      }
    }, [beforeActionConnectorSave, setCallbacks]);

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
          <UpdateConnector
            action={action}
            applicationInfoErrorMsg={applicationInfoErrorMsg}
            errors={errors}
            readOnly={readOnly}
            isLoading={isLoading}
            editActionSecrets={editActionSecrets}
            editActionConfig={editActionConfig}
            onConfirm={onModalConfirm}
            onCancel={onModalCancel}
          />
        )}
        {!isOldConnector && <InstallationCallout />}
        {isOldConnector && <DeprecatedCallout onMigrate={onMigrateClick} />}
        <Credentials
          action={action}
          errors={errors}
          readOnly={readOnly}
          isLoading={isLoading}
          editActionSecrets={editActionSecrets}
          editActionConfig={editActionConfig}
        />
        {applicationRequired && !isOldConnector && (
          <ApplicationRequiredCallout message={applicationInfoErrorMsg} />
        )}
      </>
    );
  };

// eslint-disable-next-line import/no-default-export
export { ServiceNowConnectorFields as default };
