/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiNotificationBadge,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
} from '@elastic/eui';
import { asyncForEach } from '@kbn/std';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { Module } from '../../../../common/types/modules';
import { useDashboardService } from '../../services/dashboard_service';
import { LABELS, type LabelId } from './overview_tab_content';
import type { KibanaAssetType } from './flyout';

interface Props {
  module: Module;
  selectedKibanaSubTab?: KibanaAssetType;
}

export const KibanaTabContent: FC<Props> = ({ module, selectedKibanaSubTab }) => {
  const [dashboardUrls, setDashboardUrls] = useState<Record<string, string>>({});
  const dashboardService = useDashboardService();

  useEffect(
    function setUpDashboardUrls() {
      const dashboards = module.kibana?.dashboard ?? [];
      const dashboardIds = dashboards.map(({ id }) => id);
      const urls = {};

      async function getDashboardUrls() {
        const result = await dashboardService.fetchDashboardsById(dashboardIds);

        await asyncForEach(result, async ({ id }) => {
          const url = await dashboardService.getDashboardUrl(id, ViewMode.VIEW);
          if (url) {
            urls[id] = url;
          }
        });

        if (Object.keys(urls).length > 0) {
          setDashboardUrls(urls);
        }
      }
      if (dashboards.length > 0) {
        getDashboardUrls();
      }
    },
    [dashboardService, module.kibana?.dashboard]
  );

  return (
    <>
      {Object.keys(module.kibana ?? {}).map((kibanaAsset) => {
        return (
          <>
            <EuiAccordion
              id={kibanaAsset}
              initialIsOpen={kibanaAsset === selectedKibanaSubTab}
              buttonContent={
                <EuiFlexGroup
                  justifyContent="center"
                  alignItems="center"
                  gutterSize="s"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <EuiText size="m">
                      <h4>{LABELS[kibanaAsset as LabelId]}</h4>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiNotificationBadge color="subdued" size="m">
                      <h3>{module.kibana[kibanaAsset]!.length}</h3>
                    </EuiNotificationBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              css={{ padding: '0 3%' }}
            >
              <EuiSpacer size="m" />
              <EuiSplitPanel.Outer
                hasBorder
                hasShadow={false}
                data-test-subj={`mlPreconfigJobsKibanaAssetAccordion.${kibanaAsset}`}
              >
                {module.kibana[kibanaAsset]!.map(({ config, id, title }) => {
                  return (
                    <>
                      <EuiSplitPanel.Inner
                        grow={false}
                        key={id}
                        data-test-subj={`mlPreconfigJobsKibanaAssetAccordion.${kibanaAsset}.${id}`}
                      >
                        <EuiText size="m">
                          <p>
                            {dashboardUrls && dashboardUrls[id] ? (
                              <EuiLink href={dashboardUrls[id]} target="_blank">
                                {title}
                              </EuiLink>
                            ) : (
                              title
                            )}
                          </p>
                        </EuiText>
                        {config.description && (
                          <>
                            <EuiSpacer size="s" />
                            <EuiText size="s" color="subdued">
                              <p>{config.description}</p>
                            </EuiText>
                          </>
                        )}
                      </EuiSplitPanel.Inner>
                      <EuiHorizontalRule margin="none" />
                    </>
                  );
                })}
              </EuiSplitPanel.Outer>
            </EuiAccordion>
            <EuiSpacer size="l" />
          </>
        );
      })}
    </>
  );
};
