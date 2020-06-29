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
} from '../../../../../../triggers_actions_ui/public/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../../../triggers_actions_ui/public/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertsContextValue } from '../../../../../../triggers_actions_ui/public/application/context/alerts_context';
import { LogDocumentCountAlertParams, Comparator } from '../../../../../common/alerting/logs/types';
import { DocumentCount } from './document_count';
import { Criteria } from './criteria';
import { useSourceId } from '../../../../containers/source_id';
import { LogSourceProvider, useLogSourceContext } from '../../../../containers/logs/log_source';
import { GroupByExpression } from '../../shared/group_by_expression/group_by_expression';

export interface ExpressionCriteria {
  field?: string;
  comparator?: Comparator;
  value?: string | number;
}

interface LogsContextMeta {
  isInternal?: boolean;
}

interface Props {
  errors: IErrorObject;
  alertParams: Partial<LogDocumentCountAlertParams>;
  setAlertParams(key: string, value: any): void;
  setAlertProperty(key: string, value: any): void;
  alertsContext: AlertsContextValue<LogsContextMeta>;
}

const DEFAULT_CRITERIA = { field: 'log.level', comparator: Comparator.EQ, value: 'error' };

const DEFAULT_EXPRESSION = {
  count: {
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
          <Editor {...props} />
        </SourceStatusWrapper>
      ) : (
        <LogSourceProvider sourceId={sourceId} fetch={props.alertsContext.http.fetch}>
          <SourceStatusWrapper {...props}>
            <Editor {...props} />
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
  const { setAlertParams, alertParams, errors } = props;
  const [hasSetDefaults, setHasSetDefaults] = useState<boolean>(false);
  const { sourceStatus } = useLogSourceContext();
  useMount(() => {
    for (const [key, value] of Object.entries({ ...DEFAULT_EXPRESSION, ...alertParams })) {
      setAlertParams(key, value);
      setHasSetDefaults(true);
    }
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

  const updateCount = useCallback(
    (countParams) => {
      const nextCountParams = { ...alertParams.count, ...countParams };
      setAlertParams('count', nextCountParams);
    },
    [alertParams.count, setAlertParams]
  );

  const updateCriterion = useCallback(
    (idx, criterionParams) => {
      const nextCriteria = alertParams.criteria?.map((criterion, index) => {
        return idx === index ? { ...criterion, ...criterionParams } : criterion;
      });
      setAlertParams('criteria', nextCriteria ? nextCriteria : []);
    },
    [alertParams, setAlertParams]
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

  const addCriterion = useCallback(() => {
    const nextCriteria = alertParams?.criteria
      ? [...alertParams.criteria, DEFAULT_CRITERIA]
      : [DEFAULT_CRITERIA];
    setAlertParams('criteria', nextCriteria);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [alertParams, setAlertParams]);

  const removeCriterion = useCallback(
    (idx) => {
      const nextCriteria = alertParams?.criteria?.filter((criterion, index) => {
        return index !== idx;
      });
      setAlertParams('criteria', nextCriteria);
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [alertParams, setAlertParams]
  );

  // Wait until the alert param defaults have been set
  if (!hasSetDefaults) return null;

  return (
    <>
      <DocumentCount
        comparator={alertParams.count?.comparator}
        value={alertParams.count?.value}
        updateCount={updateCount}
        errors={errors.count as IErrorObject}
      />

      <Criteria
        fields={supportedFields}
        criteria={alertParams.criteria}
        updateCriterion={updateCriterion}
        removeCriterion={removeCriterion}
        errors={errors.criteria as IErrorObject}
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

      <div>
        <EuiButtonEmpty
          color={'primary'}
          iconSide={'left'}
          flush={'left'}
          iconType={'plusInCircleFilled'}
          onClick={addCriterion}
        >
          <FormattedMessage
            id="xpack.infra.logs.alertFlyout.addCondition"
            defaultMessage="Add condition"
          />
        </EuiButtonEmpty>
      </div>
    </>
  );
};

// required for dynamic import
// eslint-disable-next-line import/no-default-export
export default ExpressionEditor;
