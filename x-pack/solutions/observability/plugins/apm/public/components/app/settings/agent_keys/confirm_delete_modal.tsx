/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import type { ApiKey } from '@kbn/security-plugin-types-common';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { callApmApi } from '../../../../services/rest/create_call_apm_api';

interface Props {
  agentKey: ApiKey;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({ agentKey, onCancel, onConfirm }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toasts } = useApmPluginContext().core.notifications;
  const { id, name } = agentKey;
  const modalTitleId = useGeneratedHtmlId();

  const deleteAgentKey = async () => {
    try {
      await callApmApi('POST /internal/apm/api_key/invalidate', {
        signal: null,
        params: {
          body: { id },
        },
      });
      toasts.addSuccess(
        i18n.translate('xpack.apm.settings.agentKeys.invalidate.succeeded', {
          defaultMessage: 'Deleted APM agent key "{name}"',
          values: { name },
        })
      );
    } catch (error) {
      toasts.addDanger(
        i18n.translate('xpack.apm.settings.agentKeys.invalidate.failed', {
          defaultMessage: 'Error deleting APM agent key "{name}"',
          values: { name },
        })
      );
    }
  };

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={i18n.translate('xpack.apm.settings.agentKeys.deleteConfirmModal.title', {
        defaultMessage: 'Delete APM agent key "{name}"?',
        values: { name },
      })}
      onCancel={onCancel}
      onConfirm={async () => {
        setIsDeleting(true);
        await deleteAgentKey();
        setIsDeleting(false);
        onConfirm();
      }}
      cancelButtonText={i18n.translate('xpack.apm.settings.agentKeys.deleteConfirmModal.cancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.apm.settings.agentKeys.deleteConfirmModal.delete', {
        defaultMessage: 'Delete',
      })}
      confirmButtonDisabled={isDeleting}
      buttonColor="danger"
      defaultFocusedButton="confirm"
    />
  );
}
