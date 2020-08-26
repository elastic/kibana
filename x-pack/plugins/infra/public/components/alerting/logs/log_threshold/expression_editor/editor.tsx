/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiLoadingSpinner, EuiSpacer, EuiButton, EuiCallOut } from '@elastic/eui';
import { useMount } from 'react-use';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  ForLastExpression,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../../triggers_actions_ui/public/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../../../../triggers_actions_ui/public/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertsContextValue } from '../../../../../../../triggers_actions_ui/public/application/context/alerts_context';
import {
  AlertParams,
  Comparator,
} from '../../../../../../common/alerting/logs/log_threshold/types';
import { Threshold } from './threshold';
import { Criteria } from './criteria';
import { useSourceId } from '../../../../../containers/source_id';
import { LogSourceProvider, useLogSourceContext } from '../../../../../containers/logs/log_source';
import { GroupByExpression } from '../../../shared/group_by_expression/group_by_expression';

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
  errors: IErrorObject;
  alertParams: Partial<AlertParams>;
  setAlertParams(key: string, value: any): void;
  setAlertProperty(key: string, value: any): void;
  alertsContext: AlertsContext;
  sourceId: string;
}

const DEFAULT_CRITERIA = { field: 'log.level', comparator: Comparator.EQ, value: 'error' };

const DEFAULT_EXPRESSION = {
  threshold: {
    value: 75,
    comparator: Comparator.GT,
  },
  criteria: [DEFAULT_CRITERIA],
  timeSize: 5,
  timeUnit: 'm',
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
  const [
    hasSetDefaultsAndConvertedLegacyParams,
    setHasSetDefaultsAndConvertedLegacyParams,
  ] = useState<boolean>(false);
  const { sourceStatus } = useLogSourceContext();
  useMount(() => {
    const mergedParams = { ...DEFAULT_EXPRESSION, ...alertParams };
    // Handle legacy case where "count" was used instead of "threshold"
    const convertedParams = {
      ...mergedParams,
      threshold: mergedParams.count ? mergedParams.count : mergedParams.threshold,
      count: undefined,
    };
    for (const [key, value] of Object.entries(convertedParams)) {
      setAlertParams(key, value);
    }
    setHasSetDefaultsAndConvertedLegacyParams(true);
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
      const nextThresholdParams = { ...alertParams.threshold, ...thresholdParams };
      setAlertParams('threshold', nextThresholdParams);
    },
    [alertParams.threshold, setAlertParams]
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

  // Wait until the alert param defaults have been set and legacy params have been converted
  if (!hasSetDefaultsAndConvertedLegacyParams) return null;

  return (
    <>
      <Threshold
        comparator={alertParams.threshold?.comparator}
        value={alertParams.threshold?.value}
        updateThreshold={updateThreshold}
        errors={errors.threshold as IErrorObject}
      />

      <Criteria
        fields={supportedFields}
        criteria={alertParams.criteria}
        errors={errors.criteria as IErrorObject}
        alertParams={alertParams}
        context={alertsContext}
        sourceId={sourceId}
        updateCriteria={updateCriteria}
      />

      <ForLastExpression
        timeWindowSize={alertParams.timeSize}
        timeWindowUnit={alertParams.timeUnit}
        onChangeWindowSize={updateTimeSize}
        onChangeWindowUnit={updateTimeUnit}
        errors={errors as { [key: string]: string[] }}
      />

      <GroupByExpression
        selectedGroups={alertParams.groupBy}
        onChange={updateGroupBy}
        fields={groupByFields}
      />
    </>
  );
};

// required for dynamic import
// eslint-disable-next-line import/no-default-export
export default ExpressionEditor;
