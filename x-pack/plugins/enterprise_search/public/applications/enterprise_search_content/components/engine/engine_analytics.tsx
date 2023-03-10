/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButtonEmpty,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ANALYTICS_PLUGIN } from '../../../../../common/constants';
import { KibanaLogic } from '../../../shared/kibana';

import { EngineAnalyticsCard } from './engine_analytics_card';

import {
  EngineAnalyticsLens,
  filterBy,
  getLensMetricLensAttributes,
  getLensXYLensAttributes,
} from './engines_lens/engine_analytics_lens';
import { EngineAnalyticsLogic } from './engine_analytics_logic';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';

const DEFAULT_TIME_RANGE = {
  start: 'now-70d',
  end: 'now',
};
export const EngineAnalytics: React.FC = () => {
  const {
    euiTheme: { colors: colors },
  } = useEuiTheme();

  const {
    isNoResultsCardVisible,
    queriesCount,
    queriesCountPercentage,
    noResults,
    noResultsPercentage,
  } = useValues(EngineAnalyticsLogic);
  const {
    data: { dataViews, search },
    formula,
    defaultDataView,
  } = useValues(KibanaLogic);

  const { setNoResultsCardVisible, setQueriesCardVisible, setSearchSessionId } =
    useActions(EngineAnalyticsLogic);

  const [timeRange, setTimeRange] = useState<{ from: string; to: string }>({
    from: DEFAULT_TIME_RANGE.start,
    to: DEFAULT_TIME_RANGE.end,
  });

  const [metricAttributesQueries, setMetricAttributesQueries] = useState<
    TypedLensByValueInput['attributes'] | null
  >(null);
  const [metricAttributesNoResults, setMetricAttributesNoResults] = useState<
    TypedLensByValueInput['attributes'] | null
  >(null);
  const xyAttributes = useMemo(
    () =>
      defaultDataView && getLensXYLensAttributes(defaultDataView, formula, !isNoResultsCardVisible),
    [isNoResultsCardVisible]
  );

  useEffect(() => {
    setSearchSessionId(search?.session.start());
    if (defaultDataView) {
      setMetricAttributesQueries(
        getLensMetricLensAttributes(defaultDataView, formula, !isNoResultsCardVisible)
      );
      setMetricAttributesNoResults(
        getLensMetricLensAttributes(defaultDataView, formula, isNoResultsCardVisible)
      );
    }
  }, []);

  return (
    <EuiFlexGroup wrap direction="column">
      <EuiFlexGroup wrap>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="m">
              <EuiIcon size="l" type="search" />
              <EuiText size="s">
                <h2>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.engine.overview.analytics.Title',
                    {
                      defaultMessage: 'Analytics',
                    }
                  )}
                </h2>
              </EuiText>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiFlexGroup wrap>
              <EuiFlexItem grow>
                <EuiText color={colors.subduedText} size="s">
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.engine.overview.analytics.subTitle',
                    {
                      defaultMessage:
                        'Gain insight into query frequency, how many queries returned no results, and how many clicks they have generated.',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="eye"
                  onClick={() => {
                    KibanaLogic.values.navigateToUrl(ANALYTICS_PLUGIN.URL, {
                      shouldNotCreateHref: true,
                    });
                  }}
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.engine.overview.analytics.button.buttonLabel.viewAnalytics',
                    {
                      defaultMessage: 'View Analytics',
                    }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiPanel hasBorder>
        <EuiFlexGroup wrap>
          <EuiFlexItem grow>
            <EuiText size="s">
              <h2>
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.engine.overview.analytics.chart.title"
                  defaultMessage="{title}"
                  values={{
                    title: !isNoResultsCardVisible ? 'Queries - Total' : 'Queries - No Results',
                  }}
                />
              </h2>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSuperDatePicker
              start={timeRange.from}
              end={timeRange.to}
              onTimeChange={({ start, end }) => {
                setTimeRange({ from: start, to: end });
              }}
              showUpdateButton={false}
              width={'auto'}
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.content.engine.overview.analytics.date.filters.endDateAriaLabel',
                { defaultMessage: 'Filter by date' }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* Chart */}

        <EuiFlexGroup wrap>
          <EngineAnalyticsLens timeRange={timeRange} attributes={xyAttributes} />
        </EuiFlexGroup>
        {/* Cards */}
        <div hidden>
          {metricAttributesQueries ? (
            <EngineAnalyticsLens
              attributes={metricAttributesQueries}
              metricAttributesQueriesFlag
              timeRange={timeRange}
            />
          ) : null}
          {metricAttributesNoResults ? (
            <EngineAnalyticsLens
              attributes={metricAttributesNoResults}
              metricAttributesNoResultsFlag
              timeRange={timeRange}
            />
          ) : null}
        </div>
        <EuiFlexGrid columns={2} direction="column">
          <EngineAnalyticsCard
            queries={queriesCount}
            percentage={queriesCountPercentage}
            cardTitle="Total queries"
            cardDisplay={!isNoResultsCardVisible ? 'success' : undefined}
            onClick={setQueriesCardVisible}
            timeRange={timeRange}
          />

          <EngineAnalyticsCard
            queries={noResults}
            percentage={noResultsPercentage}
            cardTitle="Total queries with no results"
            cardDisplay={isNoResultsCardVisible ? 'success' : undefined}
            onClick={setNoResultsCardVisible}
            timeRange={timeRange}
          />
        </EuiFlexGrid>
      </EuiPanel>
    </EuiFlexGroup>
  );
};
