/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import React, { useState } from 'react';
import { px, unit } from '../../../../../../style/variables';
import { callApmApi } from '../../../../../../services/rest/createCallApmApi';
import { useApmPluginContext } from '../../../../../../context/apm_plugin/use_apm_plugin_context';

interface Props {
  onDelete: () => void;
  customLinkId: string;
}

export function DeleteButton({ onDelete, customLinkId }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toasts } = useApmPluginContext().core.notifications;

  return (
    <EuiButtonEmpty
      color="danger"
      isLoading={isDeleting}
      iconSide="right"
      onClick={async () => {
        setIsDeleting(true);
        await deleteConfig(customLinkId, toasts);
        setIsDeleting(false);
        onDelete();
      }}
      style={{ marginRight: px(unit) }}
    >
      {i18n.translate('xpack.apm.settings.customizeUI.customLink.delete', {
        defaultMessage: 'Delete',
      })}
    </EuiButtonEmpty>
  );
}

async function deleteConfig(
  customLinkId: string,
  toasts: NotificationsStart['toasts']
) {
  try {
    await callApmApi({
      endpoint: 'DELETE /api/apm/settings/custom_links/{id}',
      signal: null,
      params: {
        path: { id: customLinkId },
      },
    });
    toasts.addSuccess({
      iconType: 'trash',
      title: i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.delete.successed',
        { defaultMessage: 'Deleted custom link.' }
      ),
    });
  } catch (error) {
    toasts.addDanger({
      iconType: 'cross',
      title: i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.delete.failed',
        { defaultMessage: 'Custom link could not be deleted' }
      ),
    });
  }
}
