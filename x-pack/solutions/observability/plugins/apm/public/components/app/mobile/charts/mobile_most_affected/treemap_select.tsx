/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSuperSelect, EuiText } from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';

export enum TreemapTypes {
  OsVersions = 'osVersions',
  AppVersions = 'appVersions',
  Devices = 'devices',
}

const options: Array<EuiSuperSelectOption<TreemapTypes>> = [
  {
    value: TreemapTypes.Devices,
    label: i18n.translate('xpack.apm.mobile.errorOverview.treemap.dropdown.devices', {
      defaultMessage: 'Devices',
    }),
    description: i18n.translate(
      'xpack.apm.mobile.errorOverview.treemap.dropdown.devices.subtitle',
      {
        defaultMessage: 'Treemap displaying the most affected devices.',
      }
    ),
  },
  {
    value: TreemapTypes.AppVersions,
    label: i18n.translate('xpack.apm.mobile.errorOverview.treemap.versions.devices', {
      defaultMessage: 'App versions',
    }),
    description: i18n.translate(
      'xpack.apm.mobile.errorOverview.treemap.dropdown.versions.subtitle',
      {
        defaultMessage: 'Treemap displaying the most affected application versions.',
      }
    ),
  },
  {
    value: TreemapTypes.OsVersions,
    label: i18n.translate('xpack.apm.mobile.errorOverview.treemap.dropdown.osVersions', {
      defaultMessage: 'OS versions',
    }),
    description: i18n.translate(
      'xpack.apm.mobile.errorOverview.treemap.dropdown.osVersions.subtitle',
      {
        defaultMessage: 'Treemap displaying the most affected OS versions.',
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

export function TreemapSelect({
  selectedTreemap,
  onChange,
}: {
  selectedTreemap: TreemapTypes;
  onChange: (value: TreemapTypes) => void;
}) {
  const currentTreemap = options.find(({ value }) => value === selectedTreemap) ?? options[0];

  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h2>
            {i18n.translate('xpack.apm.errorsOverview.treemap.title', {
              defaultMessage: 'Most affected {currentTreemap}',
              values: { currentTreemap: currentTreemap.value },
            })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSuperSelect
            fullWidth
            style={{ minWidth: '150px' }}
            options={options}
            valueOfSelected={selectedTreemap}
            onChange={onChange}
            itemLayoutAlign="top"
            hasDividers
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
