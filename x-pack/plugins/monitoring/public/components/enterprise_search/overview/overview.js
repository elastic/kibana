/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import {
  EuiPage,
  EuiPanel,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { MonitoringTimeseriesContainer } from '../../chart';
import { FormattedMessage } from '@kbn/i18n/react';
import { Status } from './status';

export class EnterpriseSearchOverview extends PureComponent {
  render() {
    const { metrics, stats, ...props } = this.props;
    const productUsageMetrics = [
      metrics.app_search_total_engines,
      metrics.workplace_search_total_org_sources,
      metrics.workplace_search_total_private_sources,
    ];

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiScreenReaderOnly>
            <h1>
              <FormattedMessage
                id="xpack.monitoring.entSearch.overview.heading"
                defaultMessage="Enterprise Search Overview"
              />
            </h1>
          </EuiScreenReaderOnly>
          <EuiSpacer size="m" />

          <EuiPanel>
            <Status stats={stats} />
          </EuiPanel>
          <EuiSpacer size="m" />

          <EuiPageContent>
            <EuiScreenReaderOnly>
              <h1>
                <FormattedMessage
                  id="xpack.monitoring.entSearch.overview.productUsage"
                  defaultMessage="Product Usage Summary"
                />
              </h1>
            </EuiScreenReaderOnly>
            <EuiFlexGrid columns={2} gutterSize="s">
              {productUsageMetrics.map((metric, index) => (
                <EuiFlexItem key={index}>
                  {/* FIXME: Figure out if we can limit the values on the graph to positive only */}
                  <MonitoringTimeseriesContainer series={metric} {...props} />
                  <EuiSpacer />
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
