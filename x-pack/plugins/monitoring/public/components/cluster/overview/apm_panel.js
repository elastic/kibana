/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { get } from 'lodash';
import { formatMetric } from 'plugins/monitoring/lib/format_number';
import { ClusterItemContainer, BytesPercentageUsage } from './helpers';

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
} from '@elastic/eui';
import { formatTimestampToDuration } from '../../../../common';

export function ApmPanel(props) {
  if (!get(props, 'apms.total', 0) > 0) {
    return null;
  }

  const goToApm = () => props.changeUrl('apm');
  const goToInstances = () => props.changeUrl('apm/instances');

  return (
    <ClusterItemContainer {...props} url="apm" title="APM">
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <EuiLink
                  onClick={goToApm}
                  aria-label="APM Overview"
                  data-test-subj="apmOverview"
                >
                  Overview
                </EuiLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>Processed Events</EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="apmsTotalEvents">
                {formatMetric(props.totalEvents, '0.[0]a')}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>Last Event</EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="apmsBytesSent">
                {formatTimestampToDuration(+moment(props.timeOfLastEvent), 'since') + ' ago'}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <EuiLink
                  onClick={goToInstances}
                  aria-label={`Apm Instances: ${props.apms.total}`}
                  data-test-subj="apmListing"
                >
                  APM Servers: <span data-test-subj="apmsTotal">{props.apms.total}</span>
                </EuiLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>Memory Usage</EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="apmMemoryUsage">
                <BytesPercentageUsage usedBytes={props.memRss} maxBytes={props.memTotal} />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
