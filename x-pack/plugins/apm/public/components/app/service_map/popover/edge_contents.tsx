/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import React from 'react';
import { useUiTracker } from '@kbn/observability-shared-plugin/public';
import { EdgeDataDefinition } from 'cytoscape';
import { ContentsProps } from '.';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { TraceSearchType } from '../../../../../common/trace_explorer';
import { TransactionTab } from '../../transaction_details/waterfall_with_summary/transaction_tabs';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
} from '../../../../../common/es_fields/apm';

export function EdgeContents({ elementData }: ContentsProps) {
  const edgeData = elementData as EdgeDataDefinition;

  const { query } = useAnyOfApmParams(
    '/service-map',
    '/services/{serviceName}/service-map',
    '/mobile-services/{serviceName}/service-map'
  );

  const apmRouter = useApmRouter();

  const sourceService = edgeData.sourceData['service.name'];

  const trackEvent = useUiTracker();

  let traceQuery: string;

  if (SERVICE_NAME in edgeData.targetData) {
    traceQuery =
      `sequence by trace.id\n` +
      ` [ span where service.name == "${sourceService}" and span.destination.service.resource != null ] by span.id\n` +
      ` [ transaction where service.name == "${edgeData.targetData[SERVICE_NAME]}" ] by parent.id`;
  } else {
    traceQuery =
      `sequence by trace.id\n` +
      ` [ transaction where service.name == "${sourceService}" ]\n` +
      ` [ span where service.name == "${sourceService}" and span.destination.service.resource == "${edgeData.targetData[SPAN_DESTINATION_SERVICE_RESOURCE]}" ]`;
  }

  const url = apmRouter.link('/traces/explorer/waterfall', {
    query: {
      ...query,
      type: TraceSearchType.eql,
      query: traceQuery,
      waterfallItemId: '',
      traceId: '',
      transactionId: '',
      detailTab: TransactionTab.timeline,
      showCriticalPath: false,
    },
  });

  return (
    <EuiFlexItem>
      {/* eslint-disable-next-line @elastic/eui/href-or-on-click*/}
      <EuiButton
        data-test-subj="apmEdgeContentsExploreTracesButton"
        href={url}
        fill={true}
        onClick={() => {
          trackEvent({
            app: 'apm',
            metricType: METRIC_TYPE.CLICK,
            metric: 'service_map_to_trace_explorer',
          });
        }}
      >
        {i18n.translate('xpack.apm.serviceMap.viewInTraceExplorer', {
          defaultMessage: 'Explore traces',
        })}
      </EuiButton>
    </EuiFlexItem>
  );
}
