/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SLOViewSettings } from './slo_view_settings';

export type SLOView = 'cardView' | 'listView';

interface Props {
  onToggleCompactView: () => void;
  onChangeView: (view: SLOView) => void;
  isCompact: boolean;
  sloView: SLOView;
}

const toggleButtonsIcons = [
  {
    id: `cardView`,
    label: 'Card View',
    iconType: 'visGauge',
    'data-test-subj': 'sloCardViewButton',
  },
  {
    id: `listView`,
    label: 'List View',
    iconType: 'list',
    'data-test-subj': 'sloListViewButton',
  },
];

export function ToggleSLOView({
  sloView,
  onChangeView,
  onToggleCompactView,
  isCompact = true,
}: Props) {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiButtonGroup
          legend={i18n.translate('xpack.observability.toggleSLOView.euiButtonGroup.sloView', {
            defaultMessage: 'SLO View',
          })}
          options={toggleButtonsIcons}
          idSelected={sloView}
          onChange={(id) => onChangeView(id as SLOView)}
          isIconOnly
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SLOViewSettings toggleCompactView={onToggleCompactView} isCompact={isCompact} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
