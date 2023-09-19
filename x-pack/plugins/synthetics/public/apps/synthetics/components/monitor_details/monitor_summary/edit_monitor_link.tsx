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

import { useCanEditSynthetics } from '../../../../../hooks/use_capabilities';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { NoPermissionsTooltip } from '../../common/components/permissions';

export const EditMonitorLink = () => {
  const { basePath } = useSyntheticsSettingsContext();

  const { monitorId } = useParams<{ monitorId: string }>();

  const canEditSynthetics = useCanEditSynthetics();
  const isLinkDisabled = !canEditSynthetics;
  const linkProps = isLinkDisabled
    ? { disabled: true }
    : { href: `${basePath}/app/synthetics/edit-monitor/${monitorId}` };

  return (
    <NoPermissionsTooltip canEditSynthetics={canEditSynthetics}>
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
