/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import { AgentConfigurationIntake } from '../../../../../../../common/agent_configuration/configuration_types';
import {
  getOptionLabel,
  omitAllOption,
} from '../../../../../../../common/agent_configuration/all_option';
import { callApmApi } from '../../../../../../services/rest/createCallApmApi';

export async function saveConfig({
  config,
  isEditMode,
  toasts,
}: {
  config: AgentConfigurationIntake;
  agentName?: string;
  isEditMode: boolean;
  toasts: NotificationsStart['toasts'];
}) {
  try {
    await callApmApi({
      pathname: '/api/apm/settings/agent-configuration',
      method: 'PUT',
      params: {
        query: { overwrite: isEditMode },
        body: {
          ...config,
          service: {
            name: omitAllOption(config.service.name),
            environment: omitAllOption(config.service.environment),
          },
        },
      },
    });

    toasts.addSuccess({
      title: i18n.translate(
        'xpack.apm.agentConfig.saveConfig.succeeded.title',
        { defaultMessage: 'Configuration saved' }
      ),
      text: i18n.translate('xpack.apm.agentConfig.saveConfig.succeeded.text', {
        defaultMessage:
          'The configuration for "{serviceName}" was saved. It will take some time to propagate to the agents.',
        values: { serviceName: getOptionLabel(config.service.name) },
      }),
    });
  } catch (error) {
    toasts.addDanger({
      title: i18n.translate('xpack.apm.agentConfig.saveConfig.failed.title', {
        defaultMessage: 'Configuration could not be saved',
      }),
      text: i18n.translate('xpack.apm.agentConfig.saveConfig.failed.text', {
        defaultMessage:
          'Something went wrong when saving the configuration for "{serviceName}". Error: "{errorMessage}"',
        values: {
          serviceName: getOptionLabel(config.service.name),
          errorMessage: error.message,
        },
      }),
    });
  }
}
