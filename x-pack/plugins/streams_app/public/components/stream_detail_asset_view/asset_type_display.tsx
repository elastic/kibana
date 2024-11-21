/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { AssetType } from '@kbn/streams-plugin/common';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiIcon, EuiText } from '@elastic/eui';

export function AssetTypeDisplay({ type }: { type: AssetType }) {
  let label: string = '';
  let icon: string = '';
  if (type === 'dashboard') {
    label = i18n.translate('xpack.streams.assetType.dashboard', {
      defaultMessage: 'Dashboard',
    });
    icon = 'dashboardApp';
  } else if (type === 'rule') {
    label = i18n.translate('xpack.streams.assetType.rule', {
      defaultMessage: 'Rule',
    });
    icon = 'bell';
  } else if (type === 'slo') {
    label = i18n.translate('xpack.streams.assetType.slo', {
      defaultMessage: 'SLO',
    });
    icon = 'visGauge';
  }

  if (!icon || !label) {
    throw new Error(`Unknown type ${type}`);
  }

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiIcon type={icon} size="s" />
      <EuiText size="s">{label}</EuiText>
    </EuiFlexGroup>
  );
}
