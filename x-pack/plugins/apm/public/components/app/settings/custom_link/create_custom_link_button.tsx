/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { NO_PERMISSION_LABEL } from '../../../../../common/custom_link';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export function CreateCustomLinkButton({ onClick }: { onClick: () => void }) {
  const { core } = useApmPluginContext();
  const canSave = core.application.capabilities.apm.save;
  return (
    <EuiToolTip content={!canSave && NO_PERMISSION_LABEL}>
      <EuiButton
        color="primary"
        fill
        iconType="plusInCircle"
        onClick={onClick}
        isDisabled={!canSave}
        data-test-subj="createButton"
      >
        {i18n.translate('xpack.apm.settings.customLink.createCustomLink', {
          defaultMessage: 'Create custom link',
        })}
      </EuiButton>
    </EuiToolTip>
  );
}
