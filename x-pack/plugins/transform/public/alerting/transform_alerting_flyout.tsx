/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { useAppDependencies } from '../app/app_dependencies';
import { TransformHealthAlertRule, TransformHealthRuleParams } from '../../common/types/alerting';
import { TRANSFORM_RULE_TYPE } from '../../common';

interface TransformAlertFlyoutProps {
  initialAlert?: TransformHealthAlertRule;
  ruleParams: TransformHealthRuleParams;
  onSave?: () => void;
  onCloseFlyout: () => void;
}

export const TransformAlertFlyout: FC<TransformAlertFlyoutProps> = ({
  initialAlert,
  ruleParams,
  onCloseFlyout,
  onSave,
}) => {
  const { triggersActionsUi } = useAppDependencies();

  const AlertFlyout = useMemo(() => {
    if (!triggersActionsUi) return;

    const commonProps = {
      onClose: () => {
        onCloseFlyout();
      },
      onSave: async () => {
        if (onSave) {
          onSave();
        }
      },
    };

    if (initialAlert) {
      return triggersActionsUi.getEditAlertFlyout({
        ...commonProps,
        initialAlert,
      });
    }

    return triggersActionsUi.getAddAlertFlyout({
      ...commonProps,
      consumer: 'stackAlerts',
      canChangeTrigger: false,
      alertTypeId: TRANSFORM_RULE_TYPE.TRANSFORM_HEALTH,
      metadata: {},
      initialValues: {
        params: ruleParams,
      },
    });
    // deps on id to avoid re-rendering on auto-refresh
  }, [triggersActionsUi, initialAlert, ruleParams, onCloseFlyout, onSave]);

  return <>{AlertFlyout}</>;
};
