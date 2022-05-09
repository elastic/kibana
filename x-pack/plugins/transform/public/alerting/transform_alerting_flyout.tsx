/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, FC, useContext, useMemo } from 'react';
import { memoize } from 'lodash';
import { BehaviorSubject, Observable } from 'rxjs';
import { pluck } from 'rxjs/operators';
import useObservable from 'react-use/lib/useObservable';
import { useAppDependencies } from '../app/app_dependencies';
import { TransformHealthAlertRule, TransformHealthRuleParams } from '../../common/types/alerting';
import { TRANSFORM_RULE_TYPE } from '../../common';

interface TransformAlertFlyoutProps {
  initialAlert?: TransformHealthAlertRule | null;
  ruleParams?: TransformHealthRuleParams | null;
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
        initialRule: {
          ...initialAlert,
          ruleTypeId: initialAlert.alertTypeId,
        },
      });
    }

    return triggersActionsUi.getAddAlertFlyout({
      ...commonProps,
      consumer: 'stackAlerts',
      canChangeTrigger: false,
      ruleTypeId: TRANSFORM_RULE_TYPE.TRANSFORM_HEALTH,
      metadata: {},
      initialValues: {
        params: ruleParams!,
      },
    });
    // deps on id to avoid re-rendering on auto-refresh
  }, [triggersActionsUi, initialAlert, ruleParams, onCloseFlyout, onSave]);

  return <>{AlertFlyout}</>;
};

interface AlertRulesManage {
  editAlertRule$: Observable<TransformHealthAlertRule | null>;
  createAlertRule$: Observable<TransformHealthRuleParams | null>;
  setEditAlertRule: (alertRule: TransformHealthAlertRule) => void;
  setCreateAlertRule: (transformId: string) => void;
  hideAlertFlyout: () => void;
}

export const getAlertRuleManageContext = memoize(function (): AlertRulesManage {
  const ruleState$ = new BehaviorSubject<{
    editAlertRule: null | TransformHealthAlertRule;
    createAlertRule: null | TransformHealthRuleParams;
  }>({
    editAlertRule: null,
    createAlertRule: null,
  });
  return {
    editAlertRule$: ruleState$.pipe(pluck('editAlertRule')),
    createAlertRule$: ruleState$.pipe(pluck('createAlertRule')),
    setEditAlertRule: (initialRule) => {
      ruleState$.next({
        createAlertRule: null,
        editAlertRule: initialRule,
      });
    },
    setCreateAlertRule: (transformId: string) => {
      ruleState$.next({
        createAlertRule: { includeTransforms: [transformId] },
        editAlertRule: null,
      });
    },
    hideAlertFlyout: () => {
      ruleState$.next({
        createAlertRule: null,
        editAlertRule: null,
      });
    },
  };
});

export const AlertRulesManageContext = createContext<AlertRulesManage>(getAlertRuleManageContext());

export function useAlertRuleFlyout(): AlertRulesManage {
  return useContext(AlertRulesManageContext);
}

export const TransformAlertFlyoutWrapper = () => {
  const { editAlertRule$, createAlertRule$, hideAlertFlyout } = useAlertRuleFlyout();
  const editAlertRule = useObservable(editAlertRule$);
  const createAlertRule = useObservable(createAlertRule$);

  return editAlertRule || createAlertRule ? (
    <TransformAlertFlyout
      initialAlert={editAlertRule}
      ruleParams={createAlertRule!}
      onCloseFlyout={hideAlertFlyout}
    />
  ) : null;
};
