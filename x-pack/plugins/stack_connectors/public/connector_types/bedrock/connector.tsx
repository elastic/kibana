/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  ActionConnectorFieldsProps,
  SimpleConnectorForm,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiLink } from '@elastic/eui';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { useGetDashboard } from './use_get_dashboard';
import * as i18n from './translations';
import { bedrockConfig, bedrockSecrets } from './constants';

const BedrockConnectorFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
  const [{ id, name }] = useFormData();

  const {
    services: {
      application: { navigateToUrl },
    },
  } = useKibana();

  const { dashboardUrl } = useGetDashboard({ connectorId: id });

  const onClick = useCallback(
    (e) => {
      e.preventDefault();
      if (dashboardUrl) {
        navigateToUrl(dashboardUrl);
      }
    },
    [dashboardUrl, navigateToUrl]
  );

  return (
    <>
      <SimpleConnectorForm
        isEdit={isEdit}
        readOnly={readOnly}
        configFormSchema={bedrockConfig}
        secretsFormSchema={bedrockSecrets}
      />

      {isEdit && dashboardUrl != null && (
        <EuiLink data-test-subj="link-bedrock-token-dashboard" onClick={onClick}>
          {i18n.USAGE_DASHBOARD_LINK(name)}
        </EuiLink>
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { BedrockConnectorFields as default };
