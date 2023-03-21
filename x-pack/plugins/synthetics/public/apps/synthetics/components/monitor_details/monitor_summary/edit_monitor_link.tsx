/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';

import { EncryptedSyntheticsMonitor } from '../../../../../../common/runtime_types';
import { useCanEditSynthetics } from '../../../../../hooks/use_capabilities';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useCanUpdatePrivateMonitor } from '../../../hooks';
import { NoPermissionsTooltip } from '../../common/components/permissions';
import { useSelectedMonitor } from '../hooks/use_selected_monitor';

export const EditMonitorLink = () => {
  const { basePath } = useSyntheticsSettingsContext();

  const { monitorId } = useParams<{ monitorId: string }>();
  const { monitor } = useSelectedMonitor();

  const canEditSynthetics = useCanEditSynthetics();
  const canUpdatePrivateMonitor = useCanUpdatePrivateMonitor(monitor as EncryptedSyntheticsMonitor);
  const isLinkDisabled = !canEditSynthetics || !canUpdatePrivateMonitor;
  const linkProps = isLinkDisabled
    ? { disabled: true }
    : { href: `${basePath}/app/synthetics/edit-monitor/${monitorId}` };

  return (
    <NoPermissionsTooltip
      canEditSynthetics={canEditSynthetics}
      canUpdatePrivateMonitor={canUpdatePrivateMonitor}
    >
      <EuiButton
        data-test-subj="syntheticsEditMonitorLinkButton"
        fill
        iconType="pencil"
        iconSide="left"
        {...linkProps}
      >
        {EDIT_MONITOR}
      </EuiButton>
    </NoPermissionsTooltip>
  );
};

const EDIT_MONITOR = i18n.translate('xpack.synthetics.monitorSummary.editMonitor', {
  defaultMessage: 'Edit monitor',
});
