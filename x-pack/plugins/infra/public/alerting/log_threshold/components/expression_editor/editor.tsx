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
  RuleTypeParamsExpressionProps,
  ForLastExpression,
} from '../../../../../../triggers_actions_ui/public';
import {
  Comparator,
  isRatioRule,
  PartialRuleParams,
  PartialCountRuleParams,
  PartialCriteria as PartialCriteriaType,
  PartialRatioRuleParams,
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

const createDefaultCountRuleParams = (
  availableFields: LogIndexField[]
): PartialCountRuleParams => ({
  ...DEFAULT_BASE_EXPRESSION,
  count: {
    value: 75,
    comparator: Comparator.GT,
  },
  criteria: [createDefaultCriterion(availableFields, 'error')],
});

const createDefaultRatioRuleParams = (
  availableFields: LogIndexField[]
): PartialRatioRuleParams => ({
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
  RuleTypeParamsExpressionProps<PartialRuleParams, LogsContextMeta>
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

export const Editor: React.FC<RuleTypeParamsExpressionProps<PartialRuleParams, LogsContextMeta>> = (
  props
) => {
  const { setRuleParams, ruleParams, errors } = props;
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
      const nextThresholdParams = { ...ruleParams.count, ...thresholdParams };
      setRuleParams('count', nextThresholdParams);
    },
    [ruleParams.count, setRuleParams]
  );

  const updateCriteria = useCallback(
    (criteria: PartialCriteriaType) => {
      setRuleParams('criteria', criteria);
    },
    [setRuleParams]
  );

  const updateTimeSize = useCallback(
    (ts: number | undefined) => {
      setRuleParams('timeSize', ts);
    },
    [setRuleParams]
  );

  const updateTimeUnit = useCallback(
    (tu: string) => {
      if (timeUnitRT.is(tu)) {
        setRuleParams('timeUnit', tu);
      }
    },
    [setRuleParams]
  );

  const updateGroupBy = useCallback(
    (groups: string[]) => {
      setRuleParams('groupBy', groups);
    },
    [setRuleParams]
  );

  const defaultCountAlertParams = useMemo(
    () => createDefaultCountRuleParams(supportedFields),
    [supportedFields]
  );

  const updateType = useCallback(
    (type: ThresholdType) => {
      const defaults =
        type === 'count' ? defaultCountAlertParams : createDefaultRatioRuleParams(supportedFields);
      // Reset properties that don't make sense switching from one context to the other
      setRuleParams('count', defaults.count);
      setRuleParams('criteria', defaults.criteria);
    },
    [defaultCountAlertParams, setRuleParams, supportedFields]
  );

  useMount(() => {
    const newAlertParams = { ...defaultCountAlertParams, ...ruleParams };
    for (const [key, value] of Object.entries(newAlertParams) as ObjectEntries<
      typeof newAlertParams
    >) {
      setRuleParams(key, value);
    }
    setHasSetDefaults(true);
  });

  const shouldShowGroupByOptimizationWarning = useMemo(() => {
    const hasSetGroupBy = ruleParams.groupBy && ruleParams.groupBy.length > 0;
    return (
      hasSetGroupBy &&
      ruleParams.count &&
      !isOptimizableGroupedThreshold(ruleParams.count.comparator, ruleParams.count.value)
    );
  }, [ruleParams]);

  // Wait until the alert param defaults have been set
  if (!hasSetDefaults) return null;

  const criteriaComponent = ruleParams.criteria ? (
    <Criteria
      fields={supportedFields}
      criteria={ruleParams.criteria}
      defaultCriterion={defaultCountAlertParams.criteria[0]}
      errors={criteriaErrors}
      ruleParams={ruleParams}
      sourceId={sourceId}
      updateCriteria={updateCriteria}
    />
  ) : null;

  return (
    <>
      <TypeSwitcher criteria={ruleParams.criteria || []} updateType={updateType} />

      {ruleParams.criteria && !isRatioRule(ruleParams.criteria) && criteriaComponent}

      <Threshold
        comparator={ruleParams.count?.comparator}
        value={ruleParams.count?.value}
        updateThreshold={updateThreshold}
        errors={thresholdErrors}
      />

      <ForLastExpression
        timeWindowSize={ruleParams.timeSize}
        timeWindowUnit={ruleParams.timeUnit}
        onChangeWindowSize={updateTimeSize}
        onChangeWindowUnit={updateTimeUnit}
        errors={{ timeWindowSize: timeWindowSizeErrors, timeSizeUnit: timeSizeUnitErrors }}
      />

      <GroupByExpression
        selectedGroups={ruleParams.groupBy}
        onChange={updateGroupBy}
        fields={groupByFields}
      />

      {ruleParams.criteria && isRatioRule(ruleParams.criteria) && criteriaComponent}

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
    <div className="euiExpression euiExpression-isUppercase euiExpression--success">
      <span className="euiExpression__description">{text}</span>
    </div>
  );
};
