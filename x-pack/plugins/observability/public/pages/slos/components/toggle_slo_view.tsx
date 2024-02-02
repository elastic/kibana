/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FindSLOResponse } from '@kbn/slo-schema';
import { SearchState } from '../hooks/use_url_search_state';
import { SortBySelect } from './common/sort_by_select';
import { SLOViewSettings } from './slo_view_settings';

export type SLOView = 'cardView' | 'listView';

interface Props {
  onToggleCompactView: () => void;
  onChangeView: (view: SLOView) => void;
  isCompact: boolean;
  sloView: SLOView;
  sloList?: FindSLOResponse;
  loading: boolean;
  initialState: SearchState;
  onStateChange: (newState: Partial<SearchState>) => void;
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
  sloList,
  loading,
  initialState,
  onStateChange,
}: Props) {
  const total = sloList?.total ?? 0;
  const pageSize = sloList?.perPage ?? 0;
  const pageIndex = sloList?.page ?? 1;

  const rangeStart = total === 0 ? 0 : pageSize * (pageIndex - 1) + 1;
  const rangeEnd = Math.min(total, pageSize * (pageIndex - 1) + pageSize);

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={true}>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.observability.overview.pagination.description"
            defaultMessage="Showing {currentCount} of {total} {slos}"
            values={{
              currentCount: <strong>{`${rangeStart}-${rangeEnd}`}</strong>,
              total,
              slos: (
                <strong>
                  <FormattedMessage
                    id="xpack.observability.overview.slos.label"
                    defaultMessage="SLOs"
                  />
                </strong>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SortBySelect initialState={initialState} loading={loading} onStateChange={onStateChange} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          buttonSize="compressed"
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
