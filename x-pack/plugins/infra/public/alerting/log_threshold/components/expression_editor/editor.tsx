/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import useMount from 'react-use/lib/useMount';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import {
  AlertTypeParamsExpressionProps,
  ForLastExpression,
} from '../../../../../../triggers_actions_ui/public';
import {
  Comparator,
  isRatioAlert,
  PartialAlertParams,
  PartialCountAlertParams,
  PartialCriteria as PartialCriteriaType,
  PartialRatioAlertParams,
  ThresholdType,
  timeUnitRT,
  isOptimizableGroupedThreshold,
} from '../../../../../common/alerting/logs/log_threshold/types';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import { ObjectEntries } from '../../../../../common/utility_types';
import {
  LogIndexField,
  LogSourceProvider,
  useLogSourceContext,
} from '../../../../containers/logs/log_source';
import { useSourceId } from '../../../../containers/source_id';
import { GroupByExpression } from '../../../common/group_by_expression/group_by_expression';
import { errorsRT } from '../../validation';
import { Criteria } from './criteria';
import { Threshold } from './threshold';
import { TypeSwitcher } from './type_switcher';

export interface ExpressionCriteria {
  field?: string;
  comparator?: Comparator;
  value?: string | number;
}

interface LogsContextMeta {
  isInternal?: boolean;
}

const DEFAULT_BASE_EXPRESSION = {
  timeSize: 5,
  timeUnit: 'm' as const,
};

const DEFAULT_FIELD = 'log.level';

const createDefaultCriterion = (
  availableFields: LogIndexField[],
  value: ExpressionCriteria['value']
) =>
  availableFields.some((availableField) => availableField.name === DEFAULT_FIELD)
    ? { field: DEFAULT_FIELD, comparator: Comparator.EQ, value }
    : { field: undefined, comparator: undefined, value: undefined };

const createDefaultCountAlertParams = (
  availableFields: LogIndexField[]
): PartialCountAlertParams => ({
  ...DEFAULT_BASE_EXPRESSION,
  count: {
    value: 75,
    comparator: Comparator.GT,
  },
  criteria: [createDefaultCriterion(availableFields, 'error')],
});

const createDefaultRatioAlertParams = (
  availableFields: LogIndexField[]
): PartialRatioAlertParams => ({
  ...DEFAULT_BASE_EXPRESSION,
  count: {
    value: 2,
    comparator: Comparator.GT,
  },
  criteria: [
    [createDefaultCriterion(availableFields, 'error')],
    [createDefaultCriterion(availableFields, 'warning')],
  ],
});

export const ExpressionEditor: React.FC<
  AlertTypeParamsExpressionProps<PartialAlertParams, LogsContextMeta>
> = (props) => {
  const isInternal = props.metadata?.isInternal ?? false;
  const [sourceId] = useSourceId();
  const { http } = useKibana().services;

  return (
    <>
      {isInternal ? (
        <SourceStatusWrapper {...props}>
          <Editor {...props} />
        </SourceStatusWrapper>
      ) : (
        <LogSourceProvider
          sourceId={sourceId}
          fetch={http!.fetch}
          indexPatternsService={props.data.indexPatterns}
        >
          <SourceStatusWrapper {...props}>
            <Editor {...props} />
          </SourceStatusWrapper>
        </LogSourceProvider>
      )}
    </>
  );
};

export const SourceStatusWrapper: React.FC = ({ children }) => {
  const {
    initialize,
    loadSource,
    isLoadingSourceConfiguration,
    hasFailedLoadingSource,
    isUninitialized,
  } = useLogSourceContext();

  useMount(() => {
    initialize();
  });

  return (
    <>
      {isLoadingSourceConfiguration || isUninitialized ? (
        <div>
          <EuiSpacer size="m" />
          <EuiLoadingSpinner size="l" />
          <EuiSpacer size="m" />
        </div>
      ) : hasFailedLoadingSource ? (
        <EuiCallOut
          title={i18n.translate('xpack.infra.logs.alertFlyout.sourceStatusError', {
            defaultMessage: 'Sorry, there was a problem loading field information',
          })}
          color="danger"
          iconType="alert"
        >
          <EuiButton onClick={loadSource} iconType="refresh">
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

export const Editor: React.FC<AlertTypeParamsExpressionProps<PartialAlertParams, LogsContextMeta>> =
  (props) => {
    const { setAlertParams, alertParams, errors } = props;
    const [hasSetDefaults, setHasSetDefaults] = useState<boolean>(false);
    const { sourceId, resolvedSourceConfiguration } = useLogSourceContext();

    const {
      criteria: criteriaErrors,
      threshold: thresholdErrors,
      timeSizeUnit: timeSizeUnitErrors,
      timeWindowSize: timeWindowSizeErrors,
    } = useMemo(() => decodeOrThrow(errorsRT)(errors), [errors]);

    const supportedFields = useMemo(() => {
      if (resolvedSourceConfiguration?.fields) {
        return resolvedSourceConfiguration.fields.filter((field) => {
          return (field.type === 'string' || field.type === 'number') && field.searchable;
        });
      } else {
        return [];
      }
    }, [resolvedSourceConfiguration]);

    const groupByFields = useMemo(() => {
      if (resolvedSourceConfiguration?.fields) {
        return resolvedSourceConfiguration.fields.filter((field) => {
          return field.type === 'string' && field.aggregatable;
        });
      } else {
        return [];
      }
    }, [resolvedSourceConfiguration]);

    const updateThreshold = useCallback(
      (thresholdParams) => {
        const nextThresholdParams = { ...alertParams.count, ...thresholdParams };
        setAlertParams('count', nextThresholdParams);
      },
      [alertParams.count, setAlertParams]
    );

    const updateCriteria = useCallback(
      (criteria: PartialCriteriaType) => {
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
        if (timeUnitRT.is(tu)) {
          setAlertParams('timeUnit', tu);
        }
      },
      [setAlertParams]
    );

    const updateGroupBy = useCallback(
      (groups: string[]) => {
        setAlertParams('groupBy', groups);
      },
      [setAlertParams]
    );

    const defaultCountAlertParams = useMemo(
      () => createDefaultCountAlertParams(supportedFields),
      [supportedFields]
    );

    const updateType = useCallback(
      (type: ThresholdType) => {
        const defaults =
          type === 'count'
            ? defaultCountAlertParams
            : createDefaultRatioAlertParams(supportedFields);
        // Reset properties that don't make sense switching from one context to the other
        setAlertParams('count', defaults.count);
        setAlertParams('criteria', defaults.criteria);
      },
      [defaultCountAlertParams, setAlertParams, supportedFields]
    );

    useMount(() => {
      const newAlertParams = { ...defaultCountAlertParams, ...alertParams };
      for (const [key, value] of Object.entries(newAlertParams) as ObjectEntries<
        typeof newAlertParams
      >) {
        setAlertParams(key, value);
      }
      setHasSetDefaults(true);
    });

    const shouldShowGroupByOptimizationWarning = useMemo(() => {
      const hasSetGroupBy = alertParams.groupBy && alertParams.groupBy.length > 0;
      return (
        hasSetGroupBy &&
        alertParams.count &&
        !isOptimizableGroupedThreshold(alertParams.count.comparator, alertParams.count.value)
      );
    }, [alertParams]);

    // Wait until the alert param defaults have been set
    if (!hasSetDefaults) return null;

    const criteriaComponent = alertParams.criteria ? (
      <Criteria
        fields={supportedFields}
        criteria={alertParams.criteria}
        defaultCriterion={defaultCountAlertParams.criteria[0]}
        errors={criteriaErrors}
        alertParams={alertParams}
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
          errors={thresholdErrors}
        />

        <ForLastExpression
          timeWindowSize={alertParams.timeSize}
          timeWindowUnit={alertParams.timeUnit}
          onChangeWindowSize={updateTimeSize}
          onChangeWindowUnit={updateTimeUnit}
          errors={{ timeWindowSize: timeWindowSizeErrors, timeSizeUnit: timeSizeUnitErrors }}
        />

        <GroupByExpression
          selectedGroups={alertParams.groupBy}
          onChange={updateGroupBy}
          fields={groupByFields}
        />

        {alertParams.criteria && isRatioAlert(alertParams.criteria) && criteriaComponent}

        {shouldShowGroupByOptimizationWarning && (
          <>
            <EuiSpacer size="l" />
            <EuiCallOut color="warning">
              {i18n.translate('xpack.infra.logs.alertFlyout.groupByOptimizationWarning', {
                defaultMessage:
                  'When setting a "group by" we highly recommend using the "{comparator}" comparator for your threshold. This can lead to significant performance improvements.',
                values: {
                  comparator: Comparator.GT,
                },
              })}
            </EuiCallOut>
          </>
        )}

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
