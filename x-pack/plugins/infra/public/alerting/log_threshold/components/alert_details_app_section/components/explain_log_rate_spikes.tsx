/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { pick } from 'lodash';
import moment from 'moment';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { DataView } from '@kbn/data-views-plugin/common';
import { ExplainLogRateSpikesContent } from '@kbn/aiops-plugin/public';

import { Rule } from '@kbn/alerting-plugin/common';
import { TopAlert } from '@kbn/observability-plugin/public';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { PartialRuleParams } from '../../../../../../common/alerting/logs/log_threshold';

export interface AlertDetailsExplainLogRateSpikesSectionProps {
  rule: Rule<PartialRuleParams>;
  alert: TopAlert<Record<string, any>>;
}

export const ExplainLogRateSpikes: FC<AlertDetailsExplainLogRateSpikesSectionProps> = ({
  rule,
  alert,
}) => {
  // TODO: fieldFormats not included in services yet
  const { services } = useKibanaContextForPlugin();
  const { dataViews: dataViewsService } = services;

  const [dataView, setDataView] = useState<DataView | undefined>();

  const testQuery = {
    match_all: {},
    // bool: {
    //   should: [
    //     {
    //       term: { 'response.keyword': '404' },
    //     },
    //   ],
    // },
  };

  useEffect(() => {
    const logViewId = rule.params.logView.logViewId;
    const dataViewId = `log-view-${logViewId}`;

    async function getDataView() {
      const dv = await await dataViewsService.get(dataViewId);
      setDataView(dv);
    }

    getDataView();
  }, [rule, dataViewsService]);

  // TODO: Replace with real time range from rule/alert
  const timeRange = { min: moment(1684024742912), max: moment(1689284726749) };

  return (
    <EuiPanel hasBorder={true} data-test-subj="explainLogRateSpikesAlertDetails">
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.infra.logs.alertDetails.explainLogRateSpikes.sectionTitle"
                defaultMessage="Explain Log Rate Spikes"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          {dataView && (
            <ExplainLogRateSpikesContent
              dataView={dataView}
              timeRange={timeRange}
              esSearchQuery={testQuery}
              initialAnalysisStart={alert.start}
              appDependencies={pick(services, [
                'application',
                'data',
                'executionContext',
                'charts',
                'fieldFormats',
                'http',
                'notifications',
                'share',
                'storage',
                'uiSettings',
                'unifiedSearch',
                'theme',
                'lens',
              ])}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
