/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { debounce } from 'lodash';
import {
  ForLastExpression,
  IErrorObject,
  RuleTypeParams,
  RuleTypeParamsExpressionProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../../utils/kibana_react';
import { Aggregators, Comparator, QUERY_INVALID } from '../../../../common/threshold_rule/types';
import { TimeUnitChar } from '../../../../common/utils/formatters/duration';
import { AlertContextMeta, AlertParams, MetricExpression } from '../types';
import { ExpressionChart } from './expression_chart';
import { ExpressionRow } from './expression_row';
import { MetricsExplorerKueryBar } from './kuery_bar';
import { MetricsExplorerOptions } from '../hooks/use_metrics_explorer_options';
import { convertKueryToElasticSearchQuery } from '../helpers/kuery';
import { useSourceContext, withSourceProvider } from '../helpers/source';
import { MetricsExplorerGroupBy } from './group_by';
const FILTER_TYPING_DEBOUNCE_MS = 500;

type Props = Omit<
  RuleTypeParamsExpressionProps<RuleTypeParams & AlertParams, AlertContextMeta>,
  'defaultActionGroupId' | 'actionGroups' | 'charts' | 'data' | 'unifiedSearch' | 'onChangeMetaData'
>;

export const defaultExpression = {
  aggType: Aggregators.CUSTOM,
  comparator: Comparator.GT,
  threshold: [],
  timeSize: 1,
  timeUnit: 'm',
} as MetricExpression;

export function Expressions(props: Props) {
  const { setRuleParams, ruleParams, errors, metadata } = props;
  const { docLinks } = useKibana().services;
  const { source, createDerivedIndexPattern } = useSourceContext();

  const [timeSize, setTimeSize] = useState<number | undefined>(1);
  const [timeUnit, setTimeUnit] = useState<TimeUnitChar | undefined>('m');
  const derivedIndexPattern = useMemo(
    () => createDerivedIndexPattern(),
    [createDerivedIndexPattern]
  );

  const options = useMemo<MetricsExplorerOptions>(() => {
    if (metadata?.currentOptions?.metrics) {
      return metadata.currentOptions as MetricsExplorerOptions;
    } else {
      return {
        metrics: [],
        aggregation: 'avg',
      };
    }
  }, [metadata]);

  const updateParams = useCallback(
    (id, e: MetricExpression) => {
      const exp = ruleParams.criteria ? ruleParams.criteria.slice() : [];
      exp[id] = e;
      setRuleParams('criteria', exp);
    },
    [setRuleParams, ruleParams.criteria]
  );

  const addExpression = useCallback(() => {
    const exp = ruleParams.criteria?.slice() || [];
    exp.push({
      ...defaultExpression,
      timeSize: timeSize ?? defaultExpression.timeSize,
      timeUnit: timeUnit ?? defaultExpression.timeUnit,
    });
    setRuleParams('criteria', exp);
  }, [setRuleParams, ruleParams.criteria, timeSize, timeUnit]);

  const removeExpression = useCallback(
    (id: number) => {
      const exp = ruleParams.criteria?.slice() || [];
      if (exp.length > 1) {
        exp.splice(id, 1);
        setRuleParams('criteria', exp);
      }
    },
    [setRuleParams, ruleParams.criteria]
  );

  const onFilterChange = useCallback(
    (filter: any) => {
      setRuleParams('filterQueryText', filter);
      try {
        setRuleParams(
          'filterQuery',
          convertKueryToElasticSearchQuery(filter, derivedIndexPattern, false) || ''
        );
      } catch (e) {
        setRuleParams('filterQuery', QUERY_INVALID);
      }
    },
    [setRuleParams, derivedIndexPattern]
  );

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const debouncedOnFilterChange = useCallback(debounce(onFilterChange, FILTER_TYPING_DEBOUNCE_MS), [
    onFilterChange,
  ]);

  const onGroupByChange = useCallback(
    (group: string | null | string[]) => {
      setRuleParams('groupBy', group && group.length ? group : '');
    },
    [setRuleParams]
  );

  const emptyError = useMemo(() => {
    return {
      aggField: [],
      timeSizeUnit: [],
      timeWindowSize: [],
    };
  }, []);

  const updateTimeSize = useCallback(
    (ts: number | undefined) => {
      const criteria =
        ruleParams.criteria?.map((c) => ({
          ...c,
          timeSize: ts,
        })) || [];
      setTimeSize(ts || undefined);
      setRuleParams('criteria', criteria);
    },
    [ruleParams.criteria, setRuleParams]
  );

  const updateTimeUnit = useCallback(
    (tu: string) => {
      const criteria =
        ruleParams.criteria?.map((c) => ({
          ...c,
          timeUnit: tu,
        })) || [];
      setTimeUnit(tu as TimeUnitChar);
      setRuleParams('criteria', criteria as AlertParams['criteria']);
    },
    [ruleParams.criteria, setRuleParams]
  );

  const preFillAlertCriteria = useCallback(() => {
    const md = metadata;
    if (md?.currentOptions?.metrics?.length) {
      setRuleParams(
        'criteria',
        md.currentOptions.metrics.map((metric) => ({
          metric: metric.field,
          comparator: Comparator.GT,
          threshold: [],
          timeSize,
          timeUnit,
          aggType: metric.aggregation,
        })) as AlertParams['criteria']
      );
    } else {
      setRuleParams('criteria', [defaultExpression]);
    }
  }, [metadata, setRuleParams, timeSize, timeUnit]);

  const preFillAlertFilter = useCallback(() => {
    const md = metadata;
    if (md && md.currentOptions?.filterQuery) {
      setRuleParams('filterQueryText', md.currentOptions.filterQuery);
      setRuleParams(
        'filterQuery',
        convertKueryToElasticSearchQuery(md.currentOptions.filterQuery, derivedIndexPattern) || ''
      );
    } else if (md && md.currentOptions?.groupBy && md.series) {
      const { groupBy } = md.currentOptions;
      const filter = Array.isArray(groupBy)
        ? groupBy.map((field, index) => `${field}: "${md.series?.keys?.[index]}"`).join(' and ')
        : `${groupBy}: "${md.series.id}"`;
      setRuleParams('filterQueryText', filter);
      setRuleParams(
        'filterQuery',
        convertKueryToElasticSearchQuery(filter, derivedIndexPattern) || ''
      );
    }
  }, [metadata, derivedIndexPattern, setRuleParams]);

  const preFillAlertGroupBy = useCallback(() => {
    const md = metadata;
    if (md && md.currentOptions?.groupBy && !md.series) {
      setRuleParams('groupBy', md.currentOptions.groupBy);
    }
  }, [metadata, setRuleParams]);

  useEffect(() => {
    if (ruleParams.criteria && ruleParams.criteria.length) {
      setTimeSize(ruleParams.criteria[0].timeSize);
      setTimeUnit(ruleParams.criteria[0].timeUnit);
    } else {
      preFillAlertCriteria();
    }

    if (!ruleParams.filterQuery) {
      preFillAlertFilter();
    }

    if (!ruleParams.groupBy) {
      preFillAlertGroupBy();
    }

    if (!ruleParams.sourceId) {
      setRuleParams('sourceId', source?.id || 'default');
    }

    if (typeof ruleParams.alertOnNoData === 'undefined') {
      setRuleParams('alertOnNoData', true);
    }
    if (typeof ruleParams.alertOnGroupDisappear === 'undefined') {
      setRuleParams('alertOnGroupDisappear', true);
    }
  }, [metadata, source]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFieldSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onFilterChange(e.target.value),
    [onFilterChange]
  );

  const hasGroupBy = useMemo(
    () => ruleParams.groupBy && ruleParams.groupBy.length > 0,
    [ruleParams.groupBy]
  );

  const disableNoData = useMemo(
    () => ruleParams.criteria?.every((c) => c.aggType === Aggregators.COUNT),
    [ruleParams.criteria]
  );

  // Test to see if any of the group fields in groupBy are already filtered down to a single
  // group by the filterQuery. If this is the case, then a groupBy is unnecessary, as it would only
  // ever produce one group instance
  const groupByFilterTestPatterns = useMemo(() => {
    if (!ruleParams.groupBy) return null;
    const groups = !Array.isArray(ruleParams.groupBy) ? [ruleParams.groupBy] : ruleParams.groupBy;
    return groups.map((group: string) => ({
      groupName: group,
      pattern: new RegExp(`{"match(_phrase)?":{"${group}":"(.*?)"}}`),
    }));
  }, [ruleParams.groupBy]);

  const redundantFilterGroupBy = useMemo(() => {
    const { filterQuery } = ruleParams;
    if (typeof filterQuery !== 'string' || !groupByFilterTestPatterns) return [];
    return groupByFilterTestPatterns
      .map(({ groupName, pattern }) => {
        if (pattern.test(filterQuery)) {
          return groupName;
        }
      })
      .filter((g) => typeof g === 'string') as string[];
  }, [ruleParams, groupByFilterTestPatterns]);

  return (
    <>
      <EuiSpacer size={'m'} />
      <EuiText size="xs">
        <h4>
          <FormattedMessage
            id="xpack.observability.threshold.rule.alertFlyout.conditions"
            defaultMessage="Conditions"
          />
        </h4>
      </EuiText>
      <EuiSpacer size={'xs'} />
      {ruleParams.criteria &&
        ruleParams.criteria.map((e, idx) => {
          return (
            <ExpressionRow
              canDelete={(ruleParams.criteria && ruleParams.criteria.length > 1) || false}
              fields={derivedIndexPattern.fields}
              remove={removeExpression}
              addExpression={addExpression}
              key={idx} // idx's don't usually make good key's but here the index has semantic meaning
              expressionId={idx}
              setRuleParams={updateParams}
              errors={(errors[idx] as IErrorObject) || emptyError}
              expression={e || {}}
              dataView={derivedIndexPattern}
            >
              <ExpressionChart
                expression={e}
                derivedIndexPattern={derivedIndexPattern}
                source={source}
                filterQuery={ruleParams.filterQueryText}
                groupBy={ruleParams.groupBy}
              />
            </ExpressionRow>
          );
        })}

      <div style={{ marginLeft: 28 }}>
        <ForLastExpression
          timeWindowSize={timeSize}
          timeWindowUnit={timeUnit}
          errors={emptyError}
          onChangeWindowSize={updateTimeSize}
          onChangeWindowUnit={updateTimeUnit}
        />
      </div>

      <EuiSpacer size={'m'} />
      <div>
        <EuiButtonEmpty
          data-test-subj="thresholdRuleExpressionsAddConditionButton"
          color={'primary'}
          iconSide={'left'}
          flush={'left'}
          iconType={'plusInCircleFilled'}
          onClick={addExpression}
        >
          <FormattedMessage
            id="xpack.observability.threshold.rule.alertFlyout.addCondition"
            defaultMessage="Add condition"
          />
        </EuiButtonEmpty>
      </div>

      <EuiSpacer size={'m'} />
      <EuiAccordion
        id="advanced-options-accordion"
        buttonContent={i18n.translate(
          'xpack.observability.threshold.rule.alertFlyout.advancedOptions',
          {
            defaultMessage: 'Advanced options',
          }
        )}
      >
        <EuiPanel color="subdued">
          <EuiCheckbox
            disabled={disableNoData}
            id="metrics-alert-no-data-toggle"
            label={
              <>
                {i18n.translate('xpack.observability.threshold.rule.alertFlyout.alertOnNoData', {
                  defaultMessage: "Alert me if there's no data",
                })}{' '}
                <EuiToolTip
                  content={
                    (disableNoData ? `${docCountNoDataDisabledHelpText} ` : '') +
                    i18n.translate(
                      'xpack.observability.threshold.rule.alertFlyout.noDataHelpText',
                      {
                        defaultMessage:
                          'Enable this to trigger the action if the metric(s) do not report any data over the expected time period, or if the alert fails to query Elasticsearch',
                      }
                    )
                  }
                >
                  <EuiIcon type="questionInCircle" color="subdued" />
                </EuiToolTip>
              </>
            }
            checked={ruleParams.alertOnNoData}
            onChange={(e) => setRuleParams('alertOnNoData', e.target.checked)}
          />
        </EuiPanel>
      </EuiAccordion>
      <EuiSpacer size={'m'} />

      <EuiFormRow
        label={i18n.translate('xpack.observability.threshold.rule.alertFlyout.filterLabel', {
          defaultMessage: 'Filter (optional)',
        })}
        helpText={i18n.translate('xpack.observability.threshold.rule.alertFlyout.filterHelpText', {
          defaultMessage: 'Use a KQL expression to limit the scope of your alert trigger.',
        })}
        fullWidth
        display="rowCompressed"
      >
        {(metadata && (
          <MetricsExplorerKueryBar
            derivedIndexPattern={derivedIndexPattern}
            onChange={debouncedOnFilterChange}
            onSubmit={onFilterChange}
            value={ruleParams.filterQueryText}
          />
        )) || (
          <EuiFieldSearch
            data-test-subj="thresholdRuleExpressionsFieldSearch"
            onChange={handleFieldSearchChange}
            value={ruleParams.filterQueryText}
            fullWidth
          />
        )}
      </EuiFormRow>

      <EuiSpacer size={'m'} />
      <EuiFormRow
        label={i18n.translate('xpack.observability.threshold.rule.alertFlyout.createAlertPerText', {
          defaultMessage: 'Group alerts by (optional)',
        })}
        helpText={i18n.translate(
          'xpack.observability.threshold.rule.alertFlyout.createAlertPerHelpText',
          {
            defaultMessage:
              'Create an alert for every unique value. For example: "host.id" or "cloud.region".',
          }
        )}
        fullWidth
        display="rowCompressed"
      >
        <MetricsExplorerGroupBy
          onChange={onGroupByChange}
          fields={derivedIndexPattern.fields}
          options={{
            ...options,
            groupBy: ruleParams.groupBy || undefined,
          }}
          errorOptions={redundantFilterGroupBy}
        />
      </EuiFormRow>
      {redundantFilterGroupBy.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="danger">
            <FormattedMessage
              id="xpack.observability.threshold.rule.alertFlyout.alertPerRedundantFilterError"
              defaultMessage="This rule may alert on {matchedGroups} less than expected, because the filter query contains a match for {groupCount, plural, one {this field} other {these fields}}. For more information, refer to {filteringAndGroupingLink}."
              values={{
                matchedGroups: <strong>{redundantFilterGroupBy.join(', ')}</strong>,
                groupCount: redundantFilterGroupBy.length,
                filteringAndGroupingLink: (
                  <EuiLink
                    data-test-subj="thresholdRuleExpressionsTheDocsLink"
                    href={`${docLinks.links.observability.metricsThreshold}#filtering-and-grouping`}
                  >
                    {i18n.translate(
                      'xpack.observability.threshold.rule.alertFlyout.alertPerRedundantFilterError.docsLink',
                      { defaultMessage: 'the docs' }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </>
      )}
      <EuiSpacer size={'s'} />
      <EuiCheckbox
        id="metrics-alert-group-disappear-toggle"
        label={
          <>
            {i18n.translate(
              'xpack.observability.threshold.rule.alertFlyout.alertOnGroupDisappear',
              {
                defaultMessage: 'Alert me if a group stops reporting data',
              }
            )}{' '}
            <EuiToolTip
              content={
                (disableNoData ? `${docCountNoDataDisabledHelpText} ` : '') +
                i18n.translate(
                  'xpack.observability.threshold.rule.alertFlyout.groupDisappearHelpText',
                  {
                    defaultMessage:
                      'Enable this to trigger the action if a previously detected group begins to report no results. This is not recommended for dynamically scaling infrastructures that may rapidly start and stop nodes automatically.',
                  }
                )
              }
            >
              <EuiIcon type="questionInCircle" color="subdued" />
            </EuiToolTip>
          </>
        }
        disabled={disableNoData || !hasGroupBy}
        checked={Boolean(hasGroupBy && ruleParams.alertOnGroupDisappear)}
        onChange={(e) => setRuleParams('alertOnGroupDisappear', e.target.checked)}
      />
      <EuiSpacer size={'m'} />
    </>
  );
}

const docCountNoDataDisabledHelpText = i18n.translate(
  'xpack.observability.threshold.rule.alertFlyout.docCountNoDataDisabledHelpText',
  {
    defaultMessage: '[This setting is not applicable to the Document Count aggregator.]',
  }
);

// required for dynamic import
// eslint-disable-next-line import/no-default-export
export default withSourceProvider<Props>(Expressions)('default');
