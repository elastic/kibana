/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import type { ChartTimeRange } from './last_updated';

export function ChartCreationInfo(props: Partial<ChartTimeRange>) {
  const dateFormat = 'lll';
  const from = moment(props.from).format(dateFormat);
  const to = moment(props.to).format(dateFormat);
  const created = moment(props.lastUpdated).format(dateFormat);

  return (
    <>
      {props.lastUpdated && (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiText size="xs">
                <FormattedMessage
                  id="xpack.observability.expView.seriesBuilder.creationTime"
                  defaultMessage="Chart created"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <EuiText size="xs">{created}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
        </>
      )}
      {props.to && props.from && (
        <>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiText size="xs">
                <FormattedMessage
                  id="xpack.observability.expView.seriesBuilder.creationContext"
                  defaultMessage="Displaying from"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <EuiText size="xs">
                {from} &#8594; {to}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
}
