/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { EuiSuperSelect, EuiText } from '@elastic/eui';
import { EmbeddedMap } from './embedded_map';
import { MapTypes } from '../../../../../../common/mobile/constants';

const availableMaps: Array<{
  id: MapTypes;
  label: string;
  description: string;
}> = [
  {
    id: MapTypes.Http,
    label: i18n.translate(
      'xpack.apm.serviceOverview.embeddedMap.dropdown.http.requests',
      {
        defaultMessage: 'HTTP requests',
      }
    ),
    description: i18n.translate(
      'xpack.apm.serviceOverview.embeddedMap.dropdown.http.requests.subtitle',
      {
        defaultMessage:
          'HTTP defines a set of request methods to indicate the desired action to be performed for a given resource',
      }
    ),
  },
  {
    id: MapTypes.Session,
    label: i18n.translate(
      'xpack.apm.serviceOverview.embeddedMap.dropdown.sessions',
      {
        defaultMessage: 'Sessions',
      }
    ),
    description: i18n.translate(
      'xpack.apm.serviceOverview.embeddedMap.dropdown.sessions.subtitle',
      {
        defaultMessage:
          'An application session begins when a user starts an application and ends when the application exits.',
      }
    ),
  },
];

export function GeoMap({
  start,
  end,
  kuery,
  filters,
}: {
  start: string;
  end: string;
  kuery?: string;
  filters: Filter[];
}) {
  const [selectedMap, setMap] = useState(MapTypes.Http);

  const currentMap =
    availableMaps.find(({ id }) => id === selectedMap) ?? availableMaps[0];

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.serviceOverview.embeddedMap.title', {
                defaultMessage: 'Geographic regions',
              })}
            </h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.apm.serviceOverview.embeddedMap.subtitle',
                {
                  defaultMessage:
                    'Map showing the total number of {currentMap} based on country and region',
                  values: { currentMap: currentMap.label },
                }
              )}
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiSuperSelect
          fullWidth
          style={{ minWidth: '200px' }}
          options={availableMaps.map((item) => ({
            inputDisplay: item.label,
            value: item.id,
            dropdownDisplay: (
              <>
                <strong>{item.label}</strong>
                <EuiText size="s" color="subdued">
                  <p>{item.description}</p>
                </EuiText>
              </>
            ),
          }))}
          valueOfSelected={selectedMap}
          onChange={(value: MapTypes) => setMap(value)}
          itemLayoutAlign="top"
          hasDividers
        />
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
