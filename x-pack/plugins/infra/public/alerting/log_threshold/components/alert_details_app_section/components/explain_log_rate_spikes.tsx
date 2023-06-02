/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';
import { pick } from 'lodash';
import moment from 'moment';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { DataView } from '@kbn/data-views-plugin/common';
import { ExplainLogRateSpikesContent } from '@kbn/aiops-plugin/public';

import { Rule } from '@kbn/alerting-plugin/common';
import { TopAlert } from '@kbn/observability-plugin/public';
import { estypes } from '@elastic/elasticsearch';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import {
  CountRuleParams,
  PartialRuleParams,
  ruleParamsRT,
} from '../../../../../../common/alerting/logs/log_threshold';
import { DEFAULT_LOG_VIEW } from '../../../../../observability_logs/log_view_state/src/defaults';
import { LogViewsClient } from '../../../../../services/log_views';
import { defaultLogViewsStaticConfig } from '../../../../../../common/log_views';
import { getESQuery } from '../query';
import { decodeOrThrow } from '../../../../../../common/runtime_types';

export interface AlertDetailsExplainLogRateSpikesSectionProps {
  rule: Rule<PartialRuleParams>;
  alert: TopAlert<Record<string, any>>;
}

export const ExplainLogRateSpikes: FC<AlertDetailsExplainLogRateSpikesSectionProps> = ({
  rule,
  alert,
}) => {
  const { services } = useKibanaContextForPlugin();
  const { dataViews: dataViewsService, http, data } = services;
  const [dataView, setDataView] = useState<DataView | undefined>();
  const [esSearchQuery, setEsSearchQuery] = useState<QueryDslQueryContainer | undefined>();

  const logViewsClient = useMemo(
    () => new LogViewsClient(data.dataViews, http, data.search.search, defaultLogViewsStaticConfig),
    [data.dataViews, data.search.search, http]
  );

  useEffect(() => {
    async function getDataView() {
      const { indices, timestampField, runtimeMappings, dataViewReference } =
        await logViewsClient.getResolvedLogView(DEFAULT_LOG_VIEW);
      const dataViewId = dataViewReference.id;

      if (dataViewId) {
        const logDataView = await dataViewsService.get(dataViewId);
        setDataView(logDataView);

        const esSearchRequest = getESQuery(
          decodeOrThrow(ruleParamsRT)(rule.params) as CountRuleParams,
          timestampField,
          indices,
          runtimeMappings,
          alert.start
        ) as estypes.SearchRequest;

        if (!esSearchRequest) {
          throw new Error('ES query could not be built from the provided alert params');
        }

        setEsSearchQuery(esSearchRequest.query);
      }
    }

    getDataView();
  }, [rule, dataViewsService, alert.start, logViewsClient]);

  const timeRange = { min: moment(alert.start).subtract(20, 'minutes'), max: moment(new Date()) };

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
              esSearchQuery={esSearchQuery}
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
