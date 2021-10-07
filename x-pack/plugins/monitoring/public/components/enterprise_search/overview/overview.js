/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { MonitoringTimeseriesContainer } from '../../chart';
import { FormattedMessage } from '@kbn/i18n/react';

export class Overview extends PureComponent {
  render() {
    const { metrics, ...props } = this.props;
    const metricsToShow = [metrics.enterprise_search_heap_used];

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
          <EuiPageContent>
            <EuiFlexGrid columns={2} gutterSize="s">
              {metricsToShow.map((metric, index) => (
                <EuiFlexItem key={index}>
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
