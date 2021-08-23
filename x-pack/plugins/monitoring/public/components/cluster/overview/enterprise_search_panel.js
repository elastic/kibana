/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { get } from 'lodash';
import { formatMetric } from '../../../lib/format_number';
import {BytesPercentageUsage, ClusterItemContainer, DisabledIfNoDataAndInSetupModeLink} from './helpers';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  EuiPanel,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiHorizontalRule,
  EuiFlexGroup,
} from '@elastic/eui';
import { SetupModeTooltip } from '../../setup_mode/tooltip';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import { isSetupModeFeatureEnabled } from '../../../lib/setup_mode';
import { SetupModeFeature } from '../../../../common/enums';

export function EnterpriseSearchPanel(props) {
  const { setupMode, versions } = props;

  const goToInstances = () => getSafeForExternalLink('#/enterprisesearch');
  const setupModeData = get(setupMode.data, 'enterprisesearch');
  const setupModeMetricbeatMigrationTooltip = isSetupModeFeatureEnabled(
    SetupModeFeature.MetricbeatMigration
  ) ? (
    <SetupModeTooltip
      setupModeData={setupModeData}
      badgeClickLink={goToInstances()}
      productName={ENTERPRISE_SEARCH_SYSTEM_ID}
    />
  ) : null;

  return (
    <ClusterItemContainer
      {...props}
      url="enterprisesearch"
      title={i18n.translate('xpack.monitoring.cluster.overview.entSearchPanel.entSearchTitle', {
        defaultMessage: 'Enterprise Search',
      })}
    >
      <EuiFlexGrid columns={4}>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <DisabledIfNoDataAndInSetupModeLink
                  setupModeEnabled={setupMode.enabled}
                  setupModeData={setupModeData}
                  href={getSafeForExternalLink('#/enterprisesearch')}
                  aria-label={i18n.translate(
                    'xpack.monitoring.cluster.overview.entSearchPanel.overviewLinkAriaLabel',
                    {
                      defaultMessage: 'Enterprise Search Overview',
                    }
                  )}
                  data-test-subj="enterpriseSearchOverview"
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.entSearchPanel.overviewLinkLabel"
                    defaultMessage="Overview"
                  />
                </DisabledIfNoDataAndInSetupModeLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.entSearchPanel.memoryUsageLabel"
                  defaultMessage="Memory Usage"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="entSearchMemoryUsage">
                <BytesPercentageUsage
                  usedBytes={props.health.jvm.memory_usage['heap_used.bytes']}
                  maxBytes={props.health.jvm.memory_usage['heap_max.bytes']}
                />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
