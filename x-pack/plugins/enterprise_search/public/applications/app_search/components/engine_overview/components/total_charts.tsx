/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { EuiButtonTo } from '../../../../shared/react_router_helpers';

import { ENGINE_ANALYTICS_PATH, ENGINE_API_LOGS_PATH, getEngineRoute } from '../../../routes';
import { TOTAL_QUERIES, TOTAL_API_OPERATIONS } from '../../analytics/constants';
import { VIEW_ANALYTICS, VIEW_API_LOGS, LAST_7_DAYS } from '../constants';

import { EngineLogic } from '../../engine';
import { EngineOverviewLogic } from '../';

export const TotalCharts: React.FC = () => {
  const { engineName } = useValues(EngineLogic);
  const engineRoute = getEngineRoute(engineName);

  const {
    // startDate,
    // endDate,
    // queriesPerDay,
    // operationsPerDay,
  } = useValues(EngineOverviewLogic);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiPageContent data-test-subj="TotalQueriesChart">
          <EuiPageContentHeader responsive={false}>
            <EuiPageContentHeaderSection>
              <EuiTitle size="xs">
                <h2>{TOTAL_QUERIES}</h2>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                {LAST_7_DAYS}
              </EuiText>
            </EuiPageContentHeaderSection>
            <EuiPageContentHeaderSection>
              <EuiButtonTo to={engineRoute + ENGINE_ANALYTICS_PATH} size="s">
                {VIEW_ANALYTICS}
              </EuiButtonTo>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            TODO: Analytics chart
            {/* <EngineAnalytics
              data={[queriesPerDay]}
              startDate={new Date(startDate)}
              endDate={new Date(endDate)}
            /> */}
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPageContent data-test-subj="TotalApiOperationsChart">
          <EuiPageContentHeader responsive={false}>
            <EuiPageContentHeaderSection>
              <EuiTitle size="xs">
                <h2>{TOTAL_API_OPERATIONS}</h2>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                {LAST_7_DAYS}
              </EuiText>
            </EuiPageContentHeaderSection>
            <EuiPageContentHeaderSection>
              <EuiButtonTo to={engineRoute + ENGINE_API_LOGS_PATH} size="s">
                {VIEW_API_LOGS}
              </EuiButtonTo>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            TODO: API Logs chart
            {/* <EngineAnalytics
              data={[operationsPerDay]}
              startDate={new Date(startDate)}
              endDate={new Date(endDate)}
            /> */}
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
