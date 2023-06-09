/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionConnectorFieldsProps,
  SimpleConnectorForm,
} from '@kbn/triggers-actions-ui-plugin/public';
import { SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiLink, EuiSpacer } from '@elastic/eui';
import {
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { OpenAiProviderType } from '../../../common/gen_ai/constants';
import * as i18n from './translations';
import {
  azureAiConfig,
  azureAiSecrets,
  getDashboardTitle,
  openAiConfig,
  openAiSecrets,
  providerOptions,
} from './constants';
const { emptyField } = fieldValidators;

const GenerativeAiConnectorFields: React.FC<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  const { getFieldDefaultValue } = useFormContext();
  const [{ config, id, name }] = useFormData({
    watch: ['config.apiProvider'],
  });
  const {
    services: {
      application: { navigateToUrl },
      dashboard,
      spaces,
    },
  } = useKibana();

  const [spaceId, setSpaceId] = useState<string>();

  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);

  const [dashboardId, setDashboardId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const getDashboardId = async (theSpaceId: string) => {
      const findDashboardsService = await dashboard.findDashboardsService();
      const foundDashboardId = (
        await findDashboardsService.findByTitle(getDashboardTitle(theSpaceId))
      )?.id;
      if (!ignore && foundDashboardId != null) {
        setDashboardId(foundDashboardId);
      }
    };
    if (dashboardId == null && spaceId != null && spaceId.length) {
      getDashboardId(spaceId);
    }
    return () => {
      ignore = true;
    };
  }, [dashboard, dashboardId, spaceId]);

  const onClick = useCallback(
    (e) => {
      e.preventDefault();
      if (dashboardId != null) {
        const url = dashboard?.locator?.getRedirectUrl({
          query: {
            language: 'kuery',
            query: `kibana.saved_objects: { id  : ${id} }`,
          },
          dashboardId,
        });
        if (url) {
          navigateToUrl(url);
        }
      }
    },
    [dashboardId, dashboard?.locator, id, navigateToUrl]
  );

  const selectedProviderDefaultValue = useMemo(
    () =>
      getFieldDefaultValue<OpenAiProviderType>('config.apiProvider') ?? OpenAiProviderType.OpenAi,
    [getFieldDefaultValue]
  );

  return (
    <>
      <UseField
        path="config.apiProvider"
        component={SelectField}
        config={{
          label: i18n.API_PROVIDER_LABEL,
          defaultValue: selectedProviderDefaultValue,
          validations: [
            {
              validator: emptyField(i18n.API_PROVIDER_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'config.apiProvider-select',
            options: providerOptions,
            fullWidth: true,
            hasNoInitialSelection: true,
            disabled: readOnly,
            readOnly,
          },
        }}
      />
      <EuiSpacer size="s" />
      {config != null && config.apiProvider === OpenAiProviderType.OpenAi && (
        <SimpleConnectorForm
          isEdit={isEdit}
          readOnly={readOnly}
          configFormSchema={openAiConfig}
          secretsFormSchema={openAiSecrets}
        />
      )}
      {/* ^v These are intentionally not if/else because of the way the `config.defaultValue` renders */}
      {config != null && config.apiProvider === OpenAiProviderType.AzureAi && (
        <SimpleConnectorForm
          isEdit={isEdit}
          readOnly={readOnly}
          configFormSchema={azureAiConfig}
          secretsFormSchema={azureAiSecrets}
        />
      )}
      {isEdit && dashboardId != null && (
        <EuiLink data-test-subj="link-gen-ai-token-dashboard" onClick={onClick}>
          {i18n.USAGE_DASHBOARD_LINK(selectedProviderDefaultValue, name)}
        </EuiLink>
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { GenerativeAiConnectorFields as default };
