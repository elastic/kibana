/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  ActionMenuDivider,
  Section,
  SectionLink,
  SectionLinks,
  SectionSubtitle,
  SectionTitle,
} from '@kbn/observability-shared-plugin/public';
import {
  AllDatasetsLocatorParams,
  ALL_DATASETS_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { getLogsLocatorsFromUrlService } from '@kbn/logs-shared-plugin/common';
import {
  ASSET_DETAILS_LOCATOR_ID,
  type AssetDetailsLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import { isJavaAgentName } from '../../../../../../common/agent_name';
import { SERVICE_NODE_NAME } from '../../../../../../common/es_fields/apm';
import { useApmPluginContext } from '../../../../../context/apm_plugin/use_apm_plugin_context';
import { isPending } from '../../../../../hooks/use_fetcher';
import { pushNewItemToKueryBar } from '../../../../shared/kuery_bar/utils';
import { useMetricOverviewHref } from '../../../../shared/links/apm/metric_overview_link';
import { useServiceNodeMetricOverviewHref } from '../../../../shared/links/apm/service_node_metric_overview_link';
import { useInstanceDetailsFetcher } from '../use_instance_details_fetcher';
import { getMenuSections } from './menu_sections';

interface Props {
  serviceName: string;
  serviceNodeName: string;
  kuery: string;
  onClose: () => void;
}

const POPOVER_WIDTH = '305px';

export function InstanceActionsMenu({ serviceName, serviceNodeName, kuery, onClose }: Props) {
  const { core, share } = useApmPluginContext();
  const { data, status } = useInstanceDetailsFetcher({
    serviceName,
    serviceNodeName,
  });
  const serviceNodeMetricOverviewHref = useServiceNodeMetricOverviewHref({
    serviceName,
    serviceNodeName,
  });
  const metricOverviewHref = useMetricOverviewHref(serviceName);
  const history = useHistory();

  const allDatasetsLocator =
    share.url.locators.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID)!;
  const { nodeLogsLocator } = getLogsLocatorsFromUrlService(share.url);
  const assetDetailsLocator =
    share.url.locators.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);

  if (isPending(status)) {
    return (
      <div
        style={{
          width: POPOVER_WIDTH,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <EuiLoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const handleFilterByInstanceClick = () => {
    onClose();
    pushNewItemToKueryBar({
      kuery,
      history,
      key: SERVICE_NODE_NAME,
      value: serviceNodeName,
    });
  };

  const metricsHref = isJavaAgentName(data.agent?.name)
    ? serviceNodeMetricOverviewHref
    : metricOverviewHref;

  const sections = getMenuSections({
    instanceDetails: data,
    basePath: core.http.basePath,
    onFilterByInstanceClick: handleFilterByInstanceClick,
    metricsHref,
    allDatasetsLocator,
    nodeLogsLocator,
    assetDetailsLocator,
  });

  return (
    <div style={{ width: POPOVER_WIDTH }}>
      {sections.map((section, idx) => {
        const isLastSection = idx !== sections.length - 1;
        return (
          <div key={idx}>
            {section.map((item) => (
              <Section key={item.key}>
                {item.title && <SectionTitle>{item.title}</SectionTitle>}
                {item.subtitle && <SectionSubtitle>{item.subtitle}</SectionSubtitle>}
                <SectionLinks>
                  {item.actions.map((action) => (
                    <SectionLink
                      key={action.key}
                      label={action.label}
                      href={action.href}
                      onClick={action.onClick}
                      color="primary"
                    />
                  ))}
                </SectionLinks>
              </Section>
            ))}
            {isLastSection && <ActionMenuDivider />}
          </div>
        );
      })}
    </div>
  );
}
