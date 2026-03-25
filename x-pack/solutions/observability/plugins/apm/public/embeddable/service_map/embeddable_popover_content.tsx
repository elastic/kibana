/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { SERVICE_NAME, SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../common/es_fields/apm';
import {
  isDependencyNodeData,
  isServiceNodeData,
  type ServiceMapNode,
  type ServiceMapEdge,
} from '../../../common/service_map';
import { isMessagingExitSpan } from '../../../common/service_map/get_service_map_nodes';
import { getPopoverTitle } from '../../components/app/service_map/popover/popover_content';
import { isEdge } from '../../components/app/service_map/popover/utils';
import { AnomalyDetection } from '../../components/app/service_map/popover/anomaly_detection';
import { StatsList } from '../../components/app/service_map/popover/stats_list';
import { POPOVER_WIDTH } from '../../components/app/service_map/popover/constants';
import { OpenInDiscover } from '../../components/shared/links/discover_links/open_in_discover';
import { useFetcher } from '../../hooks/use_fetcher';
import { FETCH_STATUS } from '../../hooks/use_fetcher';
import type { APIReturnType } from '../../services/rest/create_call_apm_api';
import type { PopoverContentProps } from '../../components/app/service_map/popover/popover_content';
import {
  getDependencyOverviewPath,
  getServiceDetailPath,
  getServiceTransactionsPath,
} from './get_service_map_url';

type ServiceNodeReturn = APIReturnType<'GET /internal/apm/service-map/service/{serviceName}'>;
type EdgeReturn = APIReturnType<'GET /internal/apm/service-map/dependency'>;

const INITIAL_SERVICE_STATE: ServiceNodeReturn = { currentPeriod: {}, previousPeriod: undefined };
const INITIAL_EDGE_STATE: Partial<EdgeReturn> = {
  currentPeriod: undefined,
  previousPeriod: undefined,
};

export interface EmbeddablePopoverContentProps extends PopoverContentProps {
  rangeFrom: string;
  rangeTo: string;
  core: CoreStart;
}

const OPEN_IN_DISCOVER_VARIANT = 'outlinedButton' as const;

/** Open in Discover – variant passed down to OpenInDiscover; no KQL filter so Discover shows full scope. */
function OpenInDiscoverButton({
  rangeFrom,
  rangeTo,
  selection,
  environment,
  variant = OPEN_IN_DISCOVER_VARIANT,
}: {
  rangeFrom: string;
  rangeTo: string;
  selection: ServiceMapNode | ServiceMapEdge;
  environment: string;
  variant?: 'button' | 'outlinedButton' | 'link';
}) {
  const common = {
    variant,
    indexType: 'traces' as const,
    rangeFrom,
    rangeTo,
  };

  if (isEdge(selection)) {
    const edgeData = selection.data;
    const sourceData = edgeData?.sourceData;
    const targetData = edgeData?.targetData;
    const sourceServiceName =
      sourceData && SERVICE_NAME in sourceData ? sourceData[SERVICE_NAME] : undefined;
    const dependencyName =
      targetData && SPAN_DESTINATION_SERVICE_RESOURCE in targetData
        ? targetData[SPAN_DESTINATION_SERVICE_RESOURCE]
        : undefined;
    if (!sourceServiceName || !dependencyName) return null;
    return (
      <OpenInDiscover
        {...common}
        dataTestSubj="apmEdgeContentsOpenInDiscoverButton"
        queryParams={{ serviceName: sourceServiceName, environment, dependencyName }}
        label={i18n.translate('xpack.apm.serviceMap.edgeContents.openInDiscover', {
          defaultMessage: 'Explore traces',
        })}
      />
    );
  }

  const nodeData = selection.data;
  if (isDependencyNodeData(nodeData)) {
    const dependencyName = nodeData.label;
    if (!dependencyName) return null;
    return (
      <OpenInDiscover
        {...common}
        dataTestSubj="apmEmbeddablePopoverOpenInDiscover"
        queryParams={{ dependencyName, environment }}
        label={i18n.translate('xpack.apm.serviceMap.embeddablePopover.openInDiscover', {
          defaultMessage: 'Open in Discover',
        })}
      />
    );
  }

  if (!isServiceNodeData(nodeData)) return null;
  const serviceName = nodeData.id;
  if (!serviceName) return null;
  return (
    <OpenInDiscover
      {...common}
      dataTestSubj="apmEmbeddablePopoverOpenInDiscover"
      queryParams={{ serviceName, environment }}
      label={i18n.translate('xpack.apm.serviceMap.embeddablePopover.openInDiscover', {
        defaultMessage: 'Open in Discover',
      })}
    />
  );
}

interface EmbeddablePopoverContentBaseProps {
  title: string;
  selection: ServiceMapNode | ServiceMapEdge;
  environment: string;
  kuery: string;
  rangeFrom: string;
  rangeTo: string;
  core: CoreStart;
}

function PopoverHeader({
  title,
  selection,
  rangeFrom,
  rangeTo,
  environment,
  kuery,
}: EmbeddablePopoverContentBaseProps) {
  return (
    <EuiFlexItem>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart" gutterSize="s">
        <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
          <EuiTitle size="xxs">
            <h3
              style={{ wordBreak: 'break-all' }}
              data-test-subj="serviceMapEmbeddablePopoverTitle"
            >
              {title}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <OpenInDiscoverButton
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            selection={selection}
            environment={environment}
            variant="button"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
    </EuiFlexItem>
  );
}

function EmbeddableEdgePopoverContent({
  selection,
  title,
  environment,
  kuery,
  start,
  end,
  rangeFrom,
  rangeTo,
  core,
}: EmbeddablePopoverContentBaseProps & { start: string; end: string }) {
  const env = environment ?? '';
  const edgeData = selection.data;
  const sourceData = edgeData?.sourceData;
  const dependencies = edgeData?.resources;
  const sourceServiceName =
    sourceData && SERVICE_NAME in sourceData ? sourceData[SERVICE_NAME] : undefined;
  const isMsgQueueConsumerEdge = isMessagingExitSpan(sourceData);
  const isGroupedEdge = edgeData?.isGrouped === true;

  const { data = INITIAL_EDGE_STATE, status } = useFetcher(
    (callApmApi) => {
      if (
        sourceServiceName &&
        dependencies &&
        dependencies.length > 0 &&
        !isMsgQueueConsumerEdge &&
        !isGroupedEdge
      ) {
        return callApmApi('GET /internal/apm/service-map/dependency', {
          params: {
            query: {
              sourceServiceName,
              dependencies,
              environment: env,
              start,
              end,
            },
          },
        });
      }
    },
    [env, sourceServiceName, dependencies, start, end, isMsgQueueConsumerEdge, isGroupedEdge]
  );

  const isLoading = status === FETCH_STATUS.LOADING;

  const viewInApmPath = sourceServiceName
    ? getServiceTransactionsPath({
        serviceName: sourceServiceName,
        rangeFrom,
        rangeTo,
        environment: env,
      })
    : '';

  const viewInApmButton = sourceServiceName && (
    <>
      <EuiSpacer size="s" />
      <EuiFlexItem>
        {/* href allows "Open in new tab"; onClick does in-app navigation */}
        <EuiButton
          data-test-subj="apmEmbeddablePopoverViewInApm"
          fill
          href={core.application.getUrlForApp('apm', { path: viewInApmPath })}
          onClick={(e) => {
            e.preventDefault();
            core.application.navigateToApp('apm', { path: viewInApmPath });
          }}
        >
          {i18n.translate('xpack.apm.serviceMap.embeddablePopover.viewInApm', {
            defaultMessage: 'View in APM',
          })}
        </EuiButton>
      </EuiFlexItem>
    </>
  );

  if (isMsgQueueConsumerEdge || isGroupedEdge) {
    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        style={{ minWidth: POPOVER_WIDTH }}
        data-test-subj="serviceMapEmbeddablePopoverContent"
      >
        <PopoverHeader
          title={title}
          selection={selection}
          environment={env}
          kuery={kuery}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          core={core}
        />
        <EuiFlexItem>
          <EuiText color="subdued" size="s">
            {i18n.translate('xpack.apm.serviceMap.embeddablePopover.edgeNoMetrics', {
              defaultMessage: 'No metrics available for this connection.',
            })}
          </EuiText>
        </EuiFlexItem>
        {viewInApmButton}
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      style={{ minWidth: POPOVER_WIDTH }}
      data-test-subj="serviceMapEmbeddablePopoverContent"
    >
      <PopoverHeader
        title={title}
        selection={selection}
        environment={env}
        kuery={kuery}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        core={core}
      />
      <EuiFlexItem>
        <StatsList data={data} isLoading={isLoading} />
      </EuiFlexItem>
      {viewInApmButton}
    </EuiFlexGroup>
  );
}

function EmbeddableServicePopoverContent({
  selection,
  title,
  environment,
  kuery,
  start,
  end,
  rangeFrom,
  rangeTo,
  core,
}: EmbeddablePopoverContentBaseProps & { start: string; end: string }) {
  const env = environment ?? '';
  const nodeData = selection.data;
  const serviceName = nodeData.id;
  const serviceAnomalyStats = nodeData.serviceAnomalyStats;

  const { data = INITIAL_SERVICE_STATE, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi('GET /internal/apm/service-map/service/{serviceName}', {
          params: {
            path: { serviceName },
            query: { environment: env, start, end },
          },
        });
      }
    },
    [env, serviceName, start, end]
  );

  const isLoading = status === FETCH_STATUS.LOADING;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      style={{ minWidth: POPOVER_WIDTH }}
      data-test-subj="serviceMapEmbeddablePopoverContent"
    >
      <PopoverHeader
        title={title}
        selection={selection}
        environment={env}
        kuery={kuery}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        core={core}
      />
      {serviceAnomalyStats && serviceName && (
        <EuiFlexItem>
          <AnomalyDetection serviceName={serviceName} serviceAnomalyStats={serviceAnomalyStats} />
          <EuiHorizontalRule margin="xs" />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <StatsList data={data} isLoading={isLoading} />
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexItem>
        {/* href allows "Open in new tab"; onClick does in-app navigation */}
        <EuiButton
          data-test-subj="apmEmbeddablePopoverViewInApm"
          fill
          href={core.application.getUrlForApp('apm', {
            path: getServiceDetailPath({
              serviceName,
              rangeFrom,
              rangeTo,
              environment: env,
            }),
          })}
          onClick={(e) => {
            e.preventDefault();
            core.application.navigateToApp('apm', {
              path: getServiceDetailPath({
                serviceName,
                rangeFrom,
                rangeTo,
                environment: env,
              }),
            });
          }}
        >
          {i18n.translate('xpack.apm.serviceMap.embeddablePopover.viewService', {
            defaultMessage: 'View Service',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function EmbeddableDependencyPopoverContent({
  selection,
  title,
  environment,
  kuery,
  start,
  end,
  rangeFrom,
  rangeTo,
  core,
}: EmbeddablePopoverContentBaseProps & { start: string; end: string }) {
  const env = environment ?? '';
  const nodeData = selection.data;
  const dependencyName = nodeData && isDependencyNodeData(nodeData) ? nodeData.label : undefined;

  const { data = INITIAL_EDGE_STATE, status } = useFetcher(
    (callApmApi) => {
      if (dependencyName && start && end) {
        return callApmApi('GET /internal/apm/service-map/dependency', {
          params: {
            query: {
              dependencies: dependencyName,
              environment: env,
              start,
              end,
            },
          },
        });
      }
    },
    [env, dependencyName, start, end]
  );

  const isLoading = status === FETCH_STATUS.LOADING;

  if (!dependencyName) {
    return null;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      style={{ minWidth: POPOVER_WIDTH }}
      data-test-subj="serviceMapEmbeddablePopoverContent"
    >
      <PopoverHeader
        title={title}
        selection={selection}
        environment={env}
        kuery={kuery}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        core={core}
      />
      <EuiFlexItem>
        <StatsList data={data} isLoading={isLoading} />
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexItem>
        {/* href allows "Open in new tab"; onClick does in-app navigation */}
        <EuiButton
          data-test-subj="apmEmbeddablePopoverViewInApm"
          fill
          href={core.application.getUrlForApp('apm', {
            path: getDependencyOverviewPath({
              dependencyName,
              rangeFrom,
              rangeTo,
              environment: env,
            }),
          })}
          onClick={(e) => {
            e.preventDefault();
            core.application.navigateToApp('apm', {
              path: getDependencyOverviewPath({
                dependencyName,
                rangeFrom,
                rangeTo,
                environment: env,
              }),
            });
          }}
        >
          {i18n.translate('xpack.apm.serviceMap.embeddablePopover.viewInApm', {
            defaultMessage: 'View in APM',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function EmbeddablePopoverContent({
  selectedNode,
  selectedEdge,
  environment,
  kuery,
  start,
  end,
  rangeFrom,
  rangeTo,
  core,
}: EmbeddablePopoverContentProps) {
  const selection = selectedEdge ?? selectedNode;
  if (selection == null) {
    return null;
  }

  const title = getPopoverTitle(selection);
  const env = environment ?? '';

  if (isEdge(selection)) {
    return (
      <EmbeddableEdgePopoverContent
        selection={selection}
        title={title}
        environment={env}
        kuery={kuery}
        start={start}
        end={end}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        core={core}
      />
    );
  }

  if (isDependencyNodeData(selection.data)) {
    return (
      <EmbeddableDependencyPopoverContent
        selection={selection}
        title={title}
        environment={env}
        kuery={kuery}
        start={start}
        end={end}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        core={core}
      />
    );
  }

  if (!isServiceNodeData(selection.data)) {
    return null;
  }

  return (
    <EmbeddableServicePopoverContent
      selection={selection}
      title={title}
      environment={env}
      kuery={kuery}
      start={start}
      end={end}
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      core={core}
    />
  );
}
