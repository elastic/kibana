/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { UptimeSettingsContext } from '../../../contexts';
import { DeleteMonitor } from './delete_monitor';

interface Props {
  id: string;
  name: string;
  isDisabled?: boolean;
  onUpdate: () => void;
}

export const Actions = ({ id, name, onUpdate, isDisabled }: Props) => {
  const { basePath } = useContext(UptimeSettingsContext);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          isDisabled={isDisabled}
          iconType="pencil"
          href={`${basePath}/app/uptime/edit-monitor/${Buffer.from(id, 'utf8').toString('base64')}`}
          aria-label={EDIT_MONITOR_LABEL}
          data-test-subj="monitorManagementEditMonitor"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DeleteMonitor onUpdate={onUpdate} name={name} id={id} isDisabled={isDisabled} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const EDIT_MONITOR_LABEL = i18n.translate('xpack.uptime.monitorManagement.editMonitorLabel', {
  defaultMessage: 'Edit monitor',
});
