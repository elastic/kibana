/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { APIReturnType } from '@kbn/apm-api-shared';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
} from '../../../../../common/es_fields/apm';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import type { ContentsProps } from './popover_content';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { StatsList } from './stats_list';
import { usePopoverFetchOptions } from './popover_fetch_options_context';
import { EdgePayloadMetricsList, hasEdgePayloadMetrics } from './edge_payload_metrics';
import { getEdgeMetrics } from '../../../../../common/agent_builder/attachments/service_map_transform';
import { isMessagingExitSpan } from '../../../../../common/service_map/get_service_map_nodes';
import { OpenInDiscover } from '../../../shared/links/discover_links/open_in_discover';
import { isEdge } from './utils';
import { APM_EBT_ACTIONS } from '../../ebt_constants';
import { SERVICE_MAP_EBT_ELEMENTS } from '../ebt_constants';

type EdgeReturn = APIReturnType<'GET /internal/apm/service-map/dependency'>;

const INITIAL_STATE: Partial<EdgeReturn> = {
  currentPeriod: undefined,
  previousPeriod: undefined,
};

const DOCUMENTATION_LINK = 'https://ela.st/docs-service-map-no-metrics-available';

function MessagingEdgeNoMetricsMessage() {
  return (
    <EuiText color="subdued" size="s" data-test-subj="apmServiceMapMessagingEdgeNoMetricsMessage">
      <FormattedMessage
        id="xpack.apm.serviceMap.edgeContents.messagingEdgeNoMetricsMessage"
        defaultMessage="No metrics available. See {documentation}."
        values={{
          documentation: (
            <EuiLink
              data-test-subj="apmServiceMapMessagingEdgeDocumentationLink"
              href={DOCUMENTATION_LINK}
              target="_blank"
            >
              {i18n.translate(
                'xpack.apm.serviceMap.edgeContents.messagingEdgeNoMetricsDocumentation',
                { defaultMessage: 'documentation' }
              )}
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  );
}

export function EdgeContents({
  selection,
  environment,
  start,
  end,
}: Pick<ContentsProps, 'selection' | 'environment' | 'start' | 'end'>) {
  const { query } = useAnyOfApmParams(
    '/service-map',
    '/services/{serviceName}/overview',
    '/mobile-services/{serviceName}/overview',
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view'
  );
  const { offset, comparisonEnabled, rangeFrom, rangeTo } = query;
  const { showToastOnError } = usePopoverFetchOptions();

  const isEdgeSelection = isEdge(selection);
  const edgeSelectionData = isEdgeSelection ? selection.data : undefined;

  const sourceData = edgeSelectionData?.sourceData;
  const targetData = edgeSelectionData?.targetData;
  const dependencies = edgeSelectionData?.resources;
  const dependencyName =
    targetData && SPAN_DESTINATION_SERVICE_RESOURCE in targetData
      ? targetData[SPAN_DESTINATION_SERVICE_RESOURCE]
      : undefined;

  const sourceServiceName =
    sourceData && SERVICE_NAME in sourceData ? sourceData[SERVICE_NAME] : undefined;
  // Message queue consumer edges (messaging dependency to service) are derived while transforming data into Service Map format, no metrics are available for these edges
  const isMsgQueueConsumerEdge = isMessagingExitSpan(sourceData);

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (sourceServiceName && dependencies && dependencies.length > 0) {
        return callApmApi('GET /internal/apm/service-map/dependency', {
          params: {
            query: {
              sourceServiceName,
              dependencies,
              environment,
              start,
              end,
              offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
            },
          },
        });
      }
    },
    [environment, sourceServiceName, dependencies, start, end, offset, comparisonEnabled],
    { showToastOnError }
  );

  const isLoading = status === FETCH_STATUS.LOADING;
  const hasFailed = !showToastOnError && status === FETCH_STATUS.FAILURE;

  // Edges without a resource to fetch stats for (service-to-service edges of the
  // Agent Builder attachment) show the metrics that came with the map instead.
  const payloadMetrics =
    isEdgeSelection && !dependencies?.length ? getEdgeMetrics(selection) : undefined;

  if (!isEdgeSelection) {
    return null;
  }

  if (isMsgQueueConsumerEdge || edgeSelectionData?.isGrouped) {
    return (
      <EuiFlexItem>
        <MessagingEdgeNoMetricsMessage />
      </EuiFlexItem>
    );
  }

  return (
    <>
      <EuiFlexItem>
        {hasEdgePayloadMetrics(payloadMetrics) ? (
          <EdgePayloadMetricsList metrics={payloadMetrics} />
        ) : (
          <StatsList data={data} isLoading={isLoading} hasFailed={hasFailed} />
        )}
      </EuiFlexItem>
      {sourceServiceName && dependencyName && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexItem>
            <OpenInDiscover
              dataTestSubj="apmEdgeContentsOpenInDiscoverButton"
              variant="button"
              indexType="traces"
              label={i18n.translate('xpack.apm.serviceMap.edgeContents.openInDiscover', {
                defaultMessage: 'Explore traces',
              })}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              queryParams={{
                serviceName: sourceServiceName,
                environment,
                dependencyName,
                sortDirection: 'DESC',
              }}
              ebt={{
                action: APM_EBT_ACTIONS.EXPLORE_TRACES,
                element: SERVICE_MAP_EBT_ELEMENTS.CONNECTION_POPOVER,
              }}
            />
          </EuiFlexItem>
        </>
      )}
    </>
  );
}
