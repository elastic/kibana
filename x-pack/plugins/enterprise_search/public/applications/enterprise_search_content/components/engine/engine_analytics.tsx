/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
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

import { EuiButtonEmptyTo } from '../../../shared/react_router_helpers';

import { EngineAnalyticsCard } from './engine_analytics_card';
import { EngineAnalyticsLogic } from './engine_analytics_logic';
import { EngineAnalyticsLens } from './engines_lens/engine_analytics_lens';
import { EngineAnalyticsLensLogic } from './engines_lens/engine_analytics_lens_logic';

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
    startDate,
    endDate,
    time,
  } = useValues(EngineAnalyticsLogic);
  const {
    setNoResultsCardVisible,
    setQueriesCardVisible,
    setStartDate,
    setEndDate,
    setSearchSessionId,
    setTimeChange,
  } = useActions(EngineAnalyticsLogic);

  const { xyAttributes, metricAttributesQueries, metricAttributesNoResults } =
    useValues(EngineAnalyticsLensLogic);
  const { getLensAreaAttributes, getLensMetricAttributes } = useActions(EngineAnalyticsLensLogic);

  const { data, defaultDataView, formula } = useValues(KibanaLogic);

  useEffect(() => {
    setSearchSessionId(data?.search?.session.start());
    getLensMetricAttributes({
      defaultDataView,
      formula,
      isNoResultsCardVisible,
    });
  }, []);
  useEffect(() => {
    getLensAreaAttributes({
      defaultDataView,
      formula,
      isNoResultsCardVisible,
    });
  }, [isNoResultsCardVisible]);

  useEffect(() => {
    setStartDate(time.from);
    setEndDate(time.to);
  }, [time.from, time.to]);

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
                <EuiButtonEmptyTo
                  iconType="eye"
                  onClick={() => {
                    KibanaLogic.values.navigateToUrl(ANALYTICS_PLUGIN.URL, {
                      shouldNotCreateHref: true,
                    });
                  }}
                  to={''}
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.engine.overview.analytics.button.buttonLabel.viewAnalytics',
                    {
                      defaultMessage: 'View Analytics',
                    }
                  )}
                </EuiButtonEmptyTo>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <div hidden>
        {metricAttributesQueries ? (
          <EngineAnalyticsLens attributes={metricAttributesQueries} metricAttributesQueriesFlag />
        ) : null}
        {metricAttributesNoResults ? (
          <EngineAnalyticsLens
            attributes={metricAttributesNoResults}
            metricAttributesNoResultsFlag
          />
        ) : null}
      </div>
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
              start={startDate}
              end={endDate}
              onTimeChange={setTimeChange}
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
          {xyAttributes ? <EngineAnalyticsLens attributes={xyAttributes} /> : null}
        </EuiFlexGroup>
        {/* Cards */}
        <EuiFlexGroup wrap>
          <EngineAnalyticsCard
            queries={queriesCount}
            percentage={queriesCountPercentage}
            cardTitle="Total queries"
            cardDisplay={!isNoResultsCardVisible ? 'success' : undefined}
            onClick={setQueriesCardVisible}
          />

          <EngineAnalyticsCard
            queries={noResults}
            percentage={noResultsPercentage}
            cardTitle="Total queries with no results"
            cardDisplay={isNoResultsCardVisible ? 'success' : undefined}
            onClick={setNoResultsCardVisible}
          />
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexGroup>
  );
};
