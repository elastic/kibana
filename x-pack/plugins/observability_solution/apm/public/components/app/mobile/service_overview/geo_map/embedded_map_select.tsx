/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { MapTypes } from '../../../../../../common/mobile/constants';

const options: Array<EuiSuperSelectOption<MapTypes>> = [
  {
    value: MapTypes.Http,
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
    value: MapTypes.Session,
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
].map(({ value, label, description }) => ({
  inputDisplay: label,
  value,
  dropdownDisplay: (
    <>
      <strong>{label}</strong>
      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>
    </>
  ),
}));

export function EmbeddedMapSelect({
  selectedMap,
  onChange,
}: {
  selectedMap: MapTypes;
  onChange: (value: MapTypes) => void;
}) {
  const currentMap =
    options.find(({ value }) => value === selectedMap) ?? options[0];

  return (
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
            {i18n.translate('xpack.apm.serviceOverview.embeddedMap.subtitle', {
              defaultMessage:
                'Map showing the total number of {currentMap} based on country and region',
              values: { currentMap: currentMap.inputDisplay as string },
            })}
          </p>
        </EuiText>
      </EuiFlexItem>

      <EuiSuperSelect
        fullWidth
        style={{ minWidth: '200px' }}
        options={options}
        valueOfSelected={selectedMap}
        onChange={onChange}
        itemLayoutAlign="top"
        hasDividers
      />
    </EuiFlexGroup>
  );
}
