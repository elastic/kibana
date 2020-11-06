/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLoadingSpinner, EuiSpacer, EuiButton, EuiCallOut } from '@elastic/eui';
import useMount from 'react-use/lib/useMount';
import { GroupByExpression } from '../../../common/group_by_expression/group_by_expression';
import {
  ForLastExpression,
  AlertsContextValue,
} from '../../../../../../triggers_actions_ui/public';
import {
  AlertParams,
  Comparator,
  ThresholdType,
  isRatioAlert,
} from '../../../../../common/alerting/logs/log_threshold/types';
import { Threshold } from './threshold';
import { Criteria } from './criteria';
import { TypeSwitcher } from './type_switcher';
import { useSourceId } from '../../../../containers/source_id';
import { LogSourceProvider, useLogSourceContext } from '../../../../containers/logs/log_source';
import { Errors } from '../../validation';

export interface ExpressionCriteria {
  field?: string;
  comparator?: Comparator;
  value?: string | number;
}

interface LogsContextMeta {
  isInternal?: boolean;
}

export type AlertsContext = AlertsContextValue<LogsContextMeta>;
interface Props {
  errors: Errors;
  alertParams: Partial<AlertParams>;
  setAlertParams(key: string, value: any): void;
  setAlertProperty(key: string, value: any): void;
  alertsContext: AlertsContext;
  sourceId: string;
}

const DEFAULT_CRITERIA = { field: 'log.level', comparator: Comparator.EQ, value: 'error' };

const DEFAULT_BASE_EXPRESSION = {
  timeSize: 5,
  timeUnit: 'm',
};

const DEFAULT_COUNT_EXPRESSION = {
  ...DEFAULT_BASE_EXPRESSION,
  count: {
    value: 75,
    comparator: Comparator.GT,
  },
  criteria: [DEFAULT_CRITERIA],
};

const DEFAULT_RATIO_EXPRESSION = {
  ...DEFAULT_BASE_EXPRESSION,
  count: {
    value: 2,
    comparator: Comparator.GT,
  },
  criteria: [
    [DEFAULT_CRITERIA],
    [{ field: 'log.level', comparator: Comparator.EQ, value: 'warning' }],
  ],
};

export const ExpressionEditor: React.FC<Props> = (props) => {
  const isInternal = props.alertsContext.metadata?.isInternal;
  const [sourceId] = useSourceId();

  return (
    <>
      {isInternal ? (
        <SourceStatusWrapper {...props}>
          <Editor {...props} sourceId={sourceId} />
        </SourceStatusWrapper>
      ) : (
        <LogSourceProvider sourceId={sourceId} fetch={props.alertsContext.http.fetch}>
          <SourceStatusWrapper {...props}>
            <Editor {...props} sourceId={sourceId} />
          </SourceStatusWrapper>
        </LogSourceProvider>
      )}
    </>
  );
};

export const SourceStatusWrapper: React.FC<Props> = (props) => {
  const {
    initialize,
    isLoadingSourceStatus,
    isUninitialized,
    hasFailedLoadingSourceStatus,
    loadSourceStatus,
  } = useLogSourceContext();
  const { children } = props;

  useMount(() => {
    initialize();
  });

  return (
    <>
      {isLoadingSourceStatus || isUninitialized ? (
        <div>
          <EuiSpacer size="m" />
          <EuiLoadingSpinner size="l" />
          <EuiSpacer size="m" />
        </div>
      ) : hasFailedLoadingSourceStatus ? (
        <EuiCallOut
          title={i18n.translate('xpack.infra.logs.alertFlyout.sourceStatusError', {
            defaultMessage: 'Sorry, there was a problem loading field information',
          })}
          color="danger"
          iconType="alert"
        >
          <EuiButton onClick={loadSourceStatus} iconType="refresh">
            {i18n.translate('xpack.infra.logs.alertFlyout.sourceStatusErrorTryAgain', {
              defaultMessage: 'Try again',
            })}
          </EuiButton>
        </EuiCallOut>
      ) : (
        children
      )}
    </>
  );
};

export const Editor: React.FC<Props> = (props) => {
  const { setAlertParams, alertParams, errors, alertsContext, sourceId } = props;
  const [hasSetDefaults, setHasSetDefaults] = useState<boolean>(false);
  const { sourceStatus } = useLogSourceContext();
  useMount(() => {
    for (const [key, value] of Object.entries({ ...DEFAULT_COUNT_EXPRESSION, ...alertParams })) {
      setAlertParams(key, value);
    }
    setHasSetDefaults(true);
  });

  const supportedFields = useMemo(() => {
    if (sourceStatus?.logIndexFields) {
      return sourceStatus.logIndexFields.filter((field) => {
        return (field.type === 'string' || field.type === 'number') && field.searchable;
      });
    } else {
      return [];
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [sourceStatus]);

  const groupByFields = useMemo(() => {
    if (sourceStatus?.logIndexFields) {
      return sourceStatus.logIndexFields.filter((field) => {
        return field.type === 'string' && field.aggregatable;
      });
    } else {
      return [];
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [sourceStatus]);

  const updateThreshold = useCallback(
    (thresholdParams) => {
      const nextThresholdParams = { ...alertParams.count, ...thresholdParams };
      setAlertParams('count', nextThresholdParams);
    },
    [alertParams.count, setAlertParams]
  );

  const updateCriteria = useCallback(
    (criteria: AlertParams['criteria']) => {
      setAlertParams('criteria', criteria);
    },
    [setAlertParams]
  );

  const updateTimeSize = useCallback(
    (ts: number | undefined) => {
      setAlertParams('timeSize', ts);
    },
    [setAlertParams]
  );

  const updateTimeUnit = useCallback(
    (tu: string) => {
      setAlertParams('timeUnit', tu);
    },
    [setAlertParams]
  );

  const updateGroupBy = useCallback(
    (groups: string[]) => {
      setAlertParams('groupBy', groups);
    },
    [setAlertParams]
  );

  const updateType = useCallback(
    (type: ThresholdType) => {
      const defaults = type === 'count' ? DEFAULT_COUNT_EXPRESSION : DEFAULT_RATIO_EXPRESSION;
      // Reset properties that don't make sense switching from one context to the other
      for (const [key, value] of Object.entries({
        criteria: defaults.criteria,
        count: defaults.count,
      })) {
        setAlertParams(key, value);
      }
    },
    [setAlertParams]
  );

  // Wait until the alert param defaults have been set
  if (!hasSetDefaults) return null;

  const criteriaComponent = alertParams.criteria ? (
    <Criteria
      fields={supportedFields}
      criteria={alertParams.criteria}
      errors={errors.criteria}
      alertParams={alertParams}
      context={alertsContext}
      sourceId={sourceId}
      updateCriteria={updateCriteria}
    />
  ) : null;

  return (
    <>
      <TypeSwitcher criteria={alertParams.criteria || []} updateType={updateType} />

      {alertParams.criteria && !isRatioAlert(alertParams.criteria) && criteriaComponent}

      <Threshold
        comparator={alertParams.count?.comparator}
        value={alertParams.count?.value}
        updateThreshold={updateThreshold}
        errors={errors.threshold}
      />

      <ForLastExpression
        timeWindowSize={alertParams.timeSize}
        timeWindowUnit={alertParams.timeUnit}
        onChangeWindowSize={updateTimeSize}
        onChangeWindowUnit={updateTimeUnit}
        errors={{ timeWindowSize: errors.timeWindowSize, timeSizeUnit: errors.timeSizeUnit }}
      />

      <GroupByExpression
        selectedGroups={alertParams.groupBy}
        onChange={updateGroupBy}
        fields={groupByFields}
      />

      {alertParams.criteria && isRatioAlert(alertParams.criteria) && criteriaComponent}

      <EuiSpacer size="l" />
    </>
  );
};

// required for dynamic import
// eslint-disable-next-line import/no-default-export
export default ExpressionEditor;

// NOTE: Temporary until EUI allow empty values in EuiExpression
// components.
export const ExpressionLike = ({ text }: { text: string }) => {
  return (
    <div className="euiExpression euiExpression-isUppercase euiExpression--secondary">
      <span className="euiExpression__description">{text}</span>
    </div>
  );
};
