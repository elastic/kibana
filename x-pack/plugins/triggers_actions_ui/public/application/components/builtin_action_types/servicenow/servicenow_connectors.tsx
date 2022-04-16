/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';

import { EuiSpacer } from '@elastic/eui';
import { snExternalServiceConfig } from '@kbn/actions-plugin/server/builtin_action_types/servicenow/config';
import { ActionConnectorFieldsProps } from '../../../../types';

import * as i18n from './translations';
import { ServiceNowActionConnector } from './types';
import { useKibana } from '../../../../common/lib/kibana';
import { DeprecatedCallout } from './deprecated_callout';
import { useGetAppInfo } from './use_get_app_info';
import { ApplicationRequiredCallout } from './application_required_callout';
import { isRESTApiError } from './helpers';
import { InstallationCallout } from './installation_callout';
import { UpdateConnector } from './update_connector';
import { updateActionConnector } from '../../../lib/action_connector_api';
import { Credentials } from './credentials';
import { checkConnectorIsDeprecated } from '../../../../common/connectors_selection';

// eslint-disable-next-line import/no-default-export
export { ServiceNowConnectorFields as default };

// eslint-disable-next-line @kbn/eslint/no-restricted-paths

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
  const { apiUrl, usesTableApi } = action.config;
  const { username, password } = action.secrets;
  const requiresNewApplication = !checkConnectorIsDeprecated(action);

  const [showUpdateConnector, setShowUpdateConnector] = useState(false);

  const { fetchAppInfo, isLoading } = useGetAppInfo({
    actionTypeId: action.actionTypeId,
  });

  const [showApplicationRequiredCallout, setShowApplicationRequiredCallout] =
    useState<boolean>(false);
  const [applicationInfoErrorMsg, setApplicationInfoErrorMsg] = useState<string | null>(null);

  const getApplicationInfo = useCallback(async () => {
    setShowApplicationRequiredCallout(false);
    setApplicationInfoErrorMsg(null);

    try {
      const res = await fetchAppInfo(action);
      if (isRESTApiError(res)) {
        throw new Error(res.error?.message ?? i18n.UNKNOWN);
      }

      return res;
    } catch (e) {
      setShowApplicationRequiredCallout(true);
      setApplicationInfoErrorMsg(e.message);
      // We need to throw here so the connector will be not be saved.
      throw e;
    }
  }, [action, fetchAppInfo]);

  const beforeActionConnectorSave = useCallback(async () => {
    if (requiresNewApplication) {
      await getApplicationInfo();
    }
  }, [getApplicationInfo, requiresNewApplication]);

  useEffect(
    () => setCallbacks({ beforeActionConnectorSave }),
    [beforeActionConnectorSave, setCallbacks]
  );

  const onMigrateClick = useCallback(() => setShowUpdateConnector(true), []);
  const onModalCancel = useCallback(() => setShowUpdateConnector(false), []);

  const onUpdateConnectorConfirm = useCallback(async () => {
    try {
      await getApplicationInfo();

      await updateActionConnector({
        http,
        connector: {
          name: action.name,
          config: { apiUrl, usesTableApi: false },
          secrets: { username, password },
        },
        id: action.id,
      });

      editActionConfig('usesTableApi', false);
      setShowUpdateConnector(false);

      toasts.addSuccess({
        title: i18n.UPDATE_SUCCESS_TOAST_TITLE(action.name),
        text: i18n.UPDATE_SUCCESS_TOAST_TEXT,
      });
    } catch (err) {
      /**
       * getApplicationInfo may throw an error if the request
       * fails or if there is a REST api error.
       *
       * We silent the errors as a callout will show and inform the user
       */
    }
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

  /**
   * Defaults the usesTableApi attribute to false
   * if it is not defined. The usesTableApi attribute
   * will be undefined only at the creation of
   * the connector.
   */
  useEffect(() => {
    if (usesTableApi == null) {
      editActionConfig('usesTableApi', false);
    }
  });

  return (
    <>
      {showUpdateConnector && (
        <UpdateConnector
          action={action}
          applicationInfoErrorMsg={applicationInfoErrorMsg}
          errors={errors}
          readOnly={readOnly}
          isLoading={isLoading}
          editActionSecrets={editActionSecrets}
          editActionConfig={editActionConfig}
          onConfirm={onUpdateConnectorConfirm}
          onCancel={onModalCancel}
        />
      )}
      {requiresNewApplication && (
        <InstallationCallout appId={snExternalServiceConfig[action.actionTypeId].appId ?? ''} />
      )}
      {!requiresNewApplication && <SpacedDeprecatedCallout onMigrate={onMigrateClick} />}
      <Credentials
        action={action}
        errors={errors}
        readOnly={readOnly}
        isLoading={isLoading}
        editActionSecrets={editActionSecrets}
        editActionConfig={editActionConfig}
      />
      {showApplicationRequiredCallout && requiresNewApplication && (
        <ApplicationRequiredCallout
          message={applicationInfoErrorMsg}
          appId={snExternalServiceConfig[action.actionTypeId].appId ?? ''}
        />
      )}
    </>
  );
};

const SpacedDeprecatedCallout = ({ onMigrate }: { onMigrate: () => void }) => (
  <>
    <EuiSpacer size="s" />
    <DeprecatedCallout onMigrate={onMigrate} />
  </>
);
