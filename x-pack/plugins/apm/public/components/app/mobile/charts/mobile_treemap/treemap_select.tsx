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

export enum TreemapTypes {
  Devices = 'devices',
  Versions = 'versions',
}

const options: Array<EuiSuperSelectOption<TreemapTypes>> = [
  {
    value: TreemapTypes.Devices,
    label: i18n.translate(
      'xpack.apm.transactionOverview.treemap.dropdown.devices',
      {
        defaultMessage: 'Devices treemap',
      }
    ),
    description: i18n.translate(
      'xpack.apm.transactionOverview.treemap.dropdown.devices.subtitle',
      {
        defaultMessage:
          'This treemap view allows for easy and faster visual way the most used devices',
      }
    ),
  },
  {
    value: TreemapTypes.Versions,
    label: i18n.translate(
      'xpack.apm.transactionOverview.treemap.versions.devices',
      {
        defaultMessage: 'Versions treemap',
      }
    ),
    description: i18n.translate(
      'xpack.apm.transactionOverview.treemap.dropdown.versions.subtitle',
      {
        defaultMessage:
          'This treemap view allows for easy and faster visual way the most used versions.',
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
  const currentTreemap =
    options.find(({ value }) => value === selectedTreemap) ?? options[0];

  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h2>
            {i18n.translate('xpack.apm.transactionOverview.treemap.title', {
              defaultMessage: 'Most used {currentTreemap}',
              values: { currentTreemap: currentTreemap.value },
            })}
          </h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.apm.transactionOverview.treemap.subtitle', {
            defaultMessage:
              'Treemap showing the total and most used {currentTreemap}',
            values: { currentTreemap: currentTreemap.value },
          })}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText style={{ fontWeight: 'bold' }} size="s">
            {i18n.translate('xpack.apm.transactionOverview.treemap.show', {
              defaultMessage: 'Show',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperSelect
            fullWidth
            style={{ minWidth: '300px' }}
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
