/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { useHistory } from 'react-router-dom';
import {
  ActionMenuDivider,
  Section,
  SectionLink,
  SectionLinks,
  SectionSubtitle,
  SectionTitle,
} from '@kbn/observability-shared-plugin/public';
import { getLogsLocatorFromUrlService } from '@kbn/logs-shared-plugin/common';
import {
  ASSET_DETAILS_LOCATOR_ID,
  type AssetDetailsLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { isJavaAgentName } from '../../../../../../common/agent_name';
import { ApmFeatureFlagName } from '../../../../../../common/apm_feature_flags';
import { SERVICE_NODE_NAME } from '../../../../../../common/es_fields/apm';
import { useApmPluginContext } from '../../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmFeatureFlag } from '../../../../../hooks/use_apm_feature_flag';
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
  const { core, share, metricsDataAccess } = useApmPluginContext();
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

  const metricsIndicesAsync = useAsync(() => {
    return metricsDataAccess?.metricsClient.metricsIndices() ?? Promise.resolve(undefined);
  }, [metricsDataAccess]);
  const metricsIndices = metricsIndicesAsync.value?.metricIndices;

  const logsLocator = getLogsLocatorFromUrlService(share.url)!;
  const assetDetailsLocator =
    share.url.locators.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);
  const discoverLocator = share.url.locators.get(DISCOVER_APP_LOCATOR);
  const infraLinksAvailable = useApmFeatureFlag(ApmFeatureFlagName.InfraUiAvailable);

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
    logsLocator,
    assetDetailsLocator,
    discoverLocator,
    infraLinksAvailable,
    metricsIndices,
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
