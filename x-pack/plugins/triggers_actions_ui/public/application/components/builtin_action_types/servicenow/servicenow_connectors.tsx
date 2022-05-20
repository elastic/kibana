/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';

import { EuiSpacer } from '@elastic/eui';
import { snExternalServiceConfig } from '@kbn/actions-plugin/common';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { ActionConnectorFieldsProps } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
import { DeprecatedCallout } from './deprecated_callout';
import { useGetAppInfo } from './use_get_app_info';
import { ApplicationRequiredCallout } from './application_required_callout';
import { isRESTApiError } from './helpers';
import { InstallationCallout } from './installation_callout';
import { UpdateConnector } from './update_connector';
import { updateActionConnector } from '../../../lib/action_connector_api';
import { Credentials } from './credentials';
import * as i18n from './translations';
import { ServiceNowActionConnector } from './types';
import { HiddenField } from '../../hidden_field';

// eslint-disable-next-line import/no-default-export
export { ServiceNowConnectorFields as default };

const ServiceNowConnectorFields: React.FC<ActionConnectorFieldsProps> = ({
  readOnly,
  registerPreSubmitValidator,
  isEdit,
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const [{ id, name, isDeprecated, actionTypeId, config, secrets }] = useFormData({
    watch: [
      'id',
      'isDeprecated',
      'actionTypeId',
      'name',
      'config.apiUrl',
      'secrets.username',
      'secrets.password',
    ],
  });
  console.log(actionTypeId);

  const requiresNewApplication = isDeprecated ?? true;
  const action = useMemo(
    () => ({
      name,
      actionTypeId,
      config,
      secrets,
    }),
    [name, actionTypeId, config, secrets]
    // TODO: Do we need the cast?
  ) as ServiceNowActionConnector;

  const [showUpdateConnector, setShowUpdateConnector] = useState(false);

  const { fetchAppInfo, isLoading } = useGetAppInfo({
    actionTypeId,
  });

  const getApplicationInfo = useCallback(async () => {
    try {
      const res = await fetchAppInfo(action);
      if (isRESTApiError(res)) {
        throw new Error(res.error?.message ?? i18n.UNKNOWN);
      }

      return res;
    } catch (e) {
      throw e;
    }
  }, [action, fetchAppInfo]);

  const preSubmitValidator = useCallback(async () => {
    if (requiresNewApplication) {
      try {
        await getApplicationInfo();
      } catch (error) {
        return {
          message: (
            <ApplicationRequiredCallout
              appId={snExternalServiceConfig[actionTypeId]?.appId ?? ''}
              message={error.message}
            />
          ),
        };
      }
    }
  }, [actionTypeId, getApplicationInfo, requiresNewApplication]);

  useEffect(
    () => registerPreSubmitValidator(preSubmitValidator),
    [preSubmitValidator, registerPreSubmitValidator]
  );

  const onMigrateClick = useCallback(() => setShowUpdateConnector(true), []);
  const onModalCancel = useCallback(() => setShowUpdateConnector(false), []);

  const onUpdateConnectorConfirm = useCallback(async () => {
    try {
      await getApplicationInfo();

      await updateActionConnector({
        http,
        connector: {
          name,
          config: { apiUrl: config.apiUrl, usesTableApi: false },
          secrets: { username: secrets.username, password: secrets.password },
        },
        id,
      });

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
  }, [getApplicationInfo, http, name, config, secrets, id, toasts, action.name]);

  return (
    <>
      {showUpdateConnector && (
        <UpdateConnector
          readOnly={readOnly}
          isLoading={isLoading}
          onConfirm={onUpdateConnectorConfirm}
          onCancel={onModalCancel}
        />
      )}
      {requiresNewApplication && (
        <InstallationCallout appId={snExternalServiceConfig[action.actionTypeId]?.appId ?? ''} />
      )}
      {!requiresNewApplication && <SpacedDeprecatedCallout onMigrate={onMigrateClick} />}
      <HiddenField path={'config.usesTableApi'} config={{ defaultValue: false }} />
      <Credentials readOnly={readOnly} isLoading={isLoading} />
    </>
  );
};

const SpacedDeprecatedCallout = ({ onMigrate }: { onMigrate: () => void }) => (
  <>
    <EuiSpacer size="s" />
    <DeprecatedCallout onMigrate={onMigrate} />
  </>
);
