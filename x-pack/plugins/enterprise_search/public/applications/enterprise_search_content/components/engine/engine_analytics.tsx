/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ANALYTICS_PLUGIN } from '../../../../../common/constants';
import { KibanaLogic } from '../../../shared/kibana';

import { EngineAnalyticsCard } from './engine_analytics_card';

import { EngineAnalyticsLogic, titles } from './engine_analytics_logic';

import {
  EngineAnalyticsLens,
  getLensMetricLensAttributes,
  getLensXYLensAttributes,
} from './engines_lens/engine_analytics_lens';

export const EngineAnalytics: React.FC = () => {
  const { lens } = useValues(KibanaLogic);

  const { isNoResultsCardVisible, defaultDataView, formula, timeRange } =
    useValues(EngineAnalyticsLogic);
  const { data } = useValues(KibanaLogic);

  const {
    setNoResultsCardVisible,
    setQueriesCardVisible,
    setSearchSessionId,
    getDefaultDataView,
    getFormula,
    setTimeRange,
  } = useActions(EngineAnalyticsLogic);

  // set default data view from kibana logic
  useEffect(() => {
    getDefaultDataView(data);
    getFormula(lens);
  }, []);

  useEffect(() => {
    setSearchSessionId(data?.search?.session.start());
  }, []);

  const xyAttributes = useMemo(
    () =>
      defaultDataView &&
      formula &&
      getLensXYLensAttributes(defaultDataView, formula, !isNoResultsCardVisible),
    [isNoResultsCardVisible, defaultDataView, formula]
  );

  const metricAttributesQueries = useMemo(
    () =>
      defaultDataView &&
      formula &&
      getLensMetricLensAttributes(defaultDataView, formula, !isNoResultsCardVisible),
    [defaultDataView, formula]
  );

  const metricAttributesNoResults = useMemo(
    () =>
      defaultDataView &&
      formula &&
      getLensMetricLensAttributes(defaultDataView, formula, isNoResultsCardVisible),
    [defaultDataView, formula]
  );

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
                <EuiText color="subdued" size="s">
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
                    title: !isNoResultsCardVisible ? titles.panelQueries : titles.panelNoResults,
                  }}
                />
              </h2>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSuperDatePicker
              start={timeRange.from}
              end={timeRange.to}
              onTimeChange={setTimeRange}
              showUpdateButton={false}
              width={'auto'}
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.content.engine.overview.analytics.date.filters.endDateAriaLabel',
                { defaultMessage: 'Filter by date' }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* Area Chart */}

        <EuiFlexGroup wrap>
          <EngineAnalyticsLens attributes={xyAttributes} />
        </EuiFlexGroup>
        {/* sets count and percentage values for the cards from onLoad props from lens Metric chart.
          This div is hidden as the lens metric chart is used to calculate the metrics not display lens chart itself */}
        <div hidden aria-hidden>
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
        <EuiFlexGroup wrap>
          <EngineAnalyticsCard
            cardDisplay={!isNoResultsCardVisible ? 'success' : undefined}
            onClick={setQueriesCardVisible}
            isQueriesCard
          />

          <EngineAnalyticsCard
            cardDisplay={isNoResultsCardVisible ? 'success' : undefined}
            onClick={setNoResultsCardVisible}
            isQueriesCard={false}
          />
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexGroup>
  );
};
