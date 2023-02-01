/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { EuiSuperSelect, EuiText } from '@elastic/eui';

import { EmbeddedMap } from './embedded_map';

export enum MapTypes {
  HTTP = 'http_requests',
  SESSIONS = 'unique_sessions',
}

export function LatencyMap({
  start,
  end,
  kuery,
  filters,
  comparisonEnabled,
}: {
  start: string;
  end: string;
  kuery?: string;
  filters: Filter[];
  comparisonEnabled: boolean;
}) {
  const [selectedMap, setMap] = useState(MapTypes.HTTP);

  const options = [
    {
      value: MapTypes.HTTP,
      inputDisplay: i18n.translate(
        'xpack.apm.serviceOverview.embeddedMap.dropdown.http.requests',
        {
          defaultMessage: 'HTTP requests',
        }
      ),
      dropdownDisplay: (
        <Fragment>
          <strong>
            {i18n.translate(
              'xpack.apm.serviceOverview.embeddedMap.dropdown.http.requests',
              {
                defaultMessage: 'HTTP requests',
              }
            )}
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.apm.serviceOverview.embeddedMap.dropdown.http.requests.subtitle',
                {
                  defaultMessage:
                    'HTTP defines a set of request methods to indicate the desired action to be performed for a given resource',
                }
              )}
            </p>
          </EuiText>
        </Fragment>
      ),
    },
    {
      value: MapTypes.SESSIONS,
      inputDisplay: i18n.translate(
        'xpack.apm.serviceOverview.embeddedMap.dropdown.sessions',
        {
          defaultMessage: 'Sessions',
        }
      ),
      dropdownDisplay: (
        <Fragment>
          <strong>
            {i18n.translate(
              'xpack.apm.serviceOverview.embeddedMap.dropdown.sessions',
              {
                defaultMessage: 'Sessions',
              }
            )}
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.apm.serviceOverview.embeddedMap.dropdown.sessions.subtitle',
                {
                  defaultMessage:
                    'An application session begins when a user starts an application and ends when the application exits.',
                }
              )}
            </p>
          </EuiText>
        </Fragment>
      ),
    },
  ];

  console.log('selectedMap', selectedMap);

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.serviceOverview.embeddedMap.title', {
                defaultMessage: 'Geographic regions',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiSuperSelect
          fullWidth
          options={options}
          valueOfSelected={selectedMap}
          onChange={(value: MapTypes) => setMap(value)}
          itemLayoutAlign="top"
          hasDividers
        />
        <EuiFlexItem grow={false}>
          {comparisonEnabled && (
            <EuiIconTip
              content={i18n.translate('xpack.apm.comparison.not.support', {
                defaultMessage: 'Comparison is not supported',
              })}
              size="m"
              type="alert"
              color="warning"
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EmbeddedMap
        selectedMap={selectedMap}
        start={start}
        end={end}
        kuery={kuery}
        filters={filters}
      />
    </>
  );
}
