/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { ViewMode } from '@kbn/embeddable-plugin/public';

import { TypedLensByValueInput } from '@kbn/lens-plugin/public';

import { KibanaLogic } from '../../../../shared/kibana';

import { EngineAnalyticsLogic } from '../engine_analytics_logic';

interface EngineAnalyticsLensProps {
  attributes: TypedLensByValueInput['attributes'];
  metricAttributesNoResultsFlag?: boolean;
  metricAttributesQueriesFlag?: boolean;
}
export const EngineAnalyticsLens: React.FC<EngineAnalyticsLensProps> = ({
  attributes,
  metricAttributesNoResultsFlag,
  metricAttributesQueriesFlag,
}) => {
  const { lens } = useValues(KibanaLogic);
  const {
    setIsLoading,
    setTotalQueries,
    setTotalQueriesPercentage,
    setNoResults,
    setNoResultsPercentage,
  } = useActions(EngineAnalyticsLogic);

  const { time, searchSessionId } = useValues(EngineAnalyticsLogic);
  const LensComponent = lens?.EmbeddableComponent;
  const displayNone = metricAttributesQueriesFlag || metricAttributesNoResultsFlag ? 'none' : '';

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <LensComponent
            id="engines-analytics-lens"
            withDefaultActions
            style={{ display: displayNone, height: 500 }}
            timeRange={time}
            attributes={attributes}
            searchSessionId={searchSessionId}
            onLoad={(val, adapters) => {
              setIsLoading(val);
              if (
                (metricAttributesQueriesFlag || metricAttributesNoResultsFlag) &&
                adapters?.tables
              ) {
                const total = adapters?.tables?.tables?.layer1?.rows[0]?.col2;
                const percentage = adapters?.tables?.tables?.layer1?.rows[0]?.col1 * 100;

                if (metricAttributesQueriesFlag) {
                  setTotalQueries(total);
                  setTotalQueriesPercentage(percentage);
                } else if (metricAttributesNoResultsFlag) {
                  setNoResults(total);
                  setNoResultsPercentage(percentage);
                }
              }
            }}
            viewMode={ViewMode.VIEW}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
