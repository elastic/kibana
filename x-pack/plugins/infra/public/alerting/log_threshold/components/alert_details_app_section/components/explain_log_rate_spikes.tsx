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
import { CoPilotPrompt, TopAlert, useCoPilot } from '@kbn/observability-plugin/public';
import { estypes } from '@elastic/elasticsearch';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { CoPilotPromptId } from '@kbn/observability-plugin/common';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import {
  Comparator,
  CountRuleParams,
  hasGroupBy,
  isRatioRuleParams,
  PartialRuleParams,
  ruleParamsRT,
} from '../../../../../../common/alerting/logs/log_threshold';
import { decodeOrThrow } from '../../../../../../common/runtime_types';
import { DEFAULT_LOG_VIEW } from '../../../../../../common/log_views';
import { getESQuery } from '../../../../../../common/alerting/logs/log_threshold/query';

export interface AlertDetailsExplainLogRateSpikesSectionProps {
  rule: Rule<PartialRuleParams>;
  alert: TopAlert<Record<string, any>>;
}

export const ExplainLogRateSpikes: FC<AlertDetailsExplainLogRateSpikesSectionProps> = ({
  rule,
  alert,
}) => {
  const { services } = useKibanaContextForPlugin();
  const { dataViews, logViews } = services;
  const [dataView, setDataView] = useState<DataView | undefined>();
  const [esSearchQuery, setEsSearchQuery] = useState<QueryDslQueryContainer | undefined>();

  useEffect(() => {
    async function getDataView() {
      const { indices, timestampField, runtimeMappings, dataViewReference } =
        await logViews.client.getResolvedLogView(DEFAULT_LOG_VIEW);

      const dataViewId = dataViewReference.id;

      if (dataViewId) {
        const logDataView = await dataViews.get(dataViewId);
        setDataView(logDataView);

        const esSearchRequest = getESQuery(
          validatedParams as CountRuleParams,
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

    const validatedParams = decodeOrThrow(ruleParamsRT)(rule.params);

    if (
      !isRatioRuleParams(validatedParams) &&
      !hasGroupBy(validatedParams) &&
      (validatedParams.count.comparator === Comparator.GT ||
        validatedParams.count.comparator === Comparator.GT_OR_EQ)
    ) {
      getDataView();
    }
  }, [rule, alert, dataViews, logViews]);

  const timeRange = { min: moment(alert.start).subtract(20, 'minutes'), max: moment(new Date()) };

  const coPilotService = useCoPilot();

  const explainLogSpikeParams = undefined;

  const explainLogSpikeTitle = i18n.translate(
    'xpack.infra.logs.alertDetails.explainLogSpikeTitle',
    {
      defaultMessage: 'Possible causes and remediations',
    }
  );

  if (!dataView) return null;

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
      <EuiFlexGroup direction="column" gutterSize="m">
        {coPilotService?.isEnabled() && explainLogSpikeParams ? (
          <EuiFlexItem grow={false}>
            <CoPilotPrompt
              coPilot={coPilotService}
              title={explainLogSpikeTitle}
              params={explainLogSpikeParams}
              promptId={CoPilotPromptId.ExplainLogSpike}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
