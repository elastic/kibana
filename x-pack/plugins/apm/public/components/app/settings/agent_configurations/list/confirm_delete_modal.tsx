/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { getOptionLabel } from '../../../../../../common/agent_configuration/all_option';
import {
  APIReturnType,
  callApmApi,
} from '../../../../../services/rest/create_call_apm_api';
import { useApmPluginContext } from '../../../../../context/apm_plugin/use_apm_plugin_context';

type Config =
  APIReturnType<'GET /api/apm/settings/agent-configuration'>['configurations'][0];

interface Props {
  config: Config;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({ config, onCancel, onConfirm }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toasts } = useApmPluginContext().core.notifications;

  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.apm.agentConfig.deleteModal.title', {
        defaultMessage: `Delete configuration`,
      })}
      onCancel={onCancel}
      onConfirm={async () => {
        setIsDeleting(true);
        await deleteConfig(config, toasts);
        setIsDeleting(false);
        onConfirm();
      }}
      cancelButtonText={i18n.translate(
        'xpack.apm.agentConfig.deleteModal.cancel',
        { defaultMessage: `Cancel` }
      )}
      confirmButtonText={i18n.translate(
        'xpack.apm.agentConfig.deleteModal.confirm',
        { defaultMessage: `Delete` }
      )}
      confirmButtonDisabled={isDeleting}
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      <p>
        {i18n.translate('xpack.apm.agentConfig.deleteModal.text', {
          defaultMessage: `You are about to delete the configuration for service "{serviceName}" and environment "{environment}".`,
          values: {
            serviceName: getOptionLabel(config.service.name),
            environment: getOptionLabel(config.service.environment),
          },
        })}
      </p>
    </EuiConfirmModal>
  );
}

async function deleteConfig(
  config: Config,
  toasts: NotificationsStart['toasts']
) {
  try {
    await callApmApi('DELETE /api/apm/settings/agent-configuration', {
      signal: null,
      params: {
        body: {
          service: {
            name: config.service.name,
            environment: config.service.environment,
          },
        },
      },
    });

    toasts.addSuccess({
      title: i18n.translate(
        'xpack.apm.agentConfig.deleteSection.deleteConfigSucceededTitle',
        { defaultMessage: 'Configuration was deleted' }
      ),
      text: i18n.translate(
        'xpack.apm.agentConfig.deleteSection.deleteConfigSucceededText',
        {
          defaultMessage:
            'You have successfully deleted a configuration for "{serviceName}". It will take some time to propagate to the agents.',
          values: { serviceName: getOptionLabel(config.service.name) },
        }
      ),
    });
  } catch (error) {
    toasts.addDanger({
      title: i18n.translate(
        'xpack.apm.agentConfig.deleteSection.deleteConfigFailedTitle',
        { defaultMessage: 'Configuration could not be deleted' }
      ),
      text: i18n.translate(
        'xpack.apm.agentConfig.deleteSection.deleteConfigFailedText',
        {
          defaultMessage:
            'Something went wrong when deleting a configuration for "{serviceName}". Error: "{errorMessage}"',
          values: {
            serviceName: getOptionLabel(config.service.name),
            errorMessage: error.message,
          },
        }
      ),
    });
  }
}
