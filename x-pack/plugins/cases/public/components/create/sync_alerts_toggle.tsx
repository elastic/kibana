/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Field, getUseField, useFormData } from '../../common/shared_imports';
import * as i18n from './translations';

const CommonUseField = getUseField({ component: Field });

interface Props {
  isLoading: boolean;
}

const SyncAlertsToggleComponent: React.FC<Props> = ({ isLoading }) => {
  const [{ syncAlerts }] = useFormData({ watch: ['syncAlerts'] });
  return (
    <CommonUseField
      path="syncAlerts"
      componentProps={{
        idAria: 'caseSyncAlerts',
        'data-test-subj': 'caseSyncAlerts',
        label: i18n.SYNC_ALERTS_LABEL,
        euiFieldProps: {
          disabled: isLoading,
          label: syncAlerts ? i18n.SYNC_ALERTS_SWITCH_LABEL_ON : i18n.SYNC_ALERTS_SWITCH_LABEL_OFF,
        },
      }}
    />
  );
};

SyncAlertsToggleComponent.displayName = 'SyncAlertsToggleComponent';

export const SyncAlertsToggle = memo(SyncAlertsToggleComponent);
