/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmPluginContext } from '../../../../../context/apm_plugin/use_apm_plugin_context';

export function CreateCustomLinkButton({ onClick }: { onClick: () => void }) {
  const { core } = useApmPluginContext();
  const canSave = core.application.capabilities.apm.save;
  return (
    <EuiToolTip
      content={
        !canSave &&
        i18n.translate(
          'xpack.apm.settings.customizeUI.customLink.noPermissionTooltipLabel',
          {
            defaultMessage:
              "Your user role doesn't have permissions to create custom links",
          }
        )
      }
    >
      <EuiButton
        color="primary"
        fill
        iconType="plusInCircle"
        onClick={onClick}
        isDisabled={!canSave}
        data-test-subj="createButton"
      >
        {i18n.translate(
          'xpack.apm.settings.customizeUI.customLink.createCustomLink',
          { defaultMessage: 'Create custom link' }
        )}
      </EuiButton>
    </EuiToolTip>
  );
}
