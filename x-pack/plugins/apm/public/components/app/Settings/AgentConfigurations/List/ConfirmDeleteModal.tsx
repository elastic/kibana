/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { NotificationsStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AgentConfigurationListAPIResponse } from '../../../../../../server/lib/settings/agent_configuration/list_configurations';
import { getOptionLabel } from '../../../../../../common/agent_configuration/all_option';
import { callApmApi } from '../../../../../services/rest/createCallApmApi';
import { useApmPluginContext } from '../../../../../hooks/useApmPluginContext';

type Config = AgentConfigurationListAPIResponse[0];

interface Props {
  config: Config;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({ config, onCancel, onConfirm }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toasts } = useApmPluginContext().core.notifications;

  return (
    <EuiOverlayMask>
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
    </EuiOverlayMask>
  );
}

async function deleteConfig(
  config: Config,
  toasts: NotificationsStart['toasts']
) {
  try {
    await callApmApi({
      pathname: '/api/apm/settings/agent-configuration',
      method: 'DELETE',
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
