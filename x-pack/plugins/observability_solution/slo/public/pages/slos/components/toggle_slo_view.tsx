/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FindSLOResponse } from '@kbn/slo-schema';
import React from 'react';
import type { SearchState } from '../hooks/use_url_search_state';
import { SLOSortBy } from './common/sort_by_select';
import { SloGroupBy } from './slo_list_group_by';
export type SLOView = 'cardView' | 'listView' | 'compactView';

interface Props {
  onChangeView: (view: SLOView) => void;
  onStateChange: (newState: Partial<SearchState>) => void;
  sloView: SLOView;
  state: SearchState;
  sloList?: FindSLOResponse;
  loading: boolean;
}

const toggleButtonsIcons = [
  {
    id: `cardView`,
    label: 'Card View',
    iconType: 'apps',
    'data-test-subj': 'sloCardViewButton',
  },
  {
    id: `listView`,
    label: 'List View',
    iconType: 'list',
    'data-test-subj': 'sloListViewButton',
  },
  {
    iconType: 'tableDensityCompact',
    id: 'compactView',
    label: i18n.translate('xpack.slo.listView.compactViewLabel', {
      defaultMessage: 'Compact view',
    }),
  },
];

export function ToggleSLOView({
  sloView,
  onChangeView,
  onStateChange,
  sloList,
  state,
  loading,
}: Props) {
  const total = sloList?.total ?? 0;
  const pageSize = sloList?.perPage ?? 0;
  const pageIndex = sloList?.page ?? 1;

  const rangeStart = total === 0 ? 0 : pageSize * (pageIndex - 1) + 1;
  const rangeEnd = Math.min(total, pageSize * (pageIndex - 1) + pageSize);

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={true}>
        {(!state.groupBy || state.groupBy === 'ungrouped') && (
          <EuiText size="s">
            <FormattedMessage
              id="xpack.slo.overview.pagination.description"
              defaultMessage="Showing {currentCount} of {total} {slos}"
              values={{
                currentCount: <strong>{`${rangeStart}-${rangeEnd}`}</strong>,
                total,
                slos: (
                  <strong>
                    <FormattedMessage id="xpack.slo.overview.slos.label" defaultMessage="SLOs" />
                  </strong>
                ),
              }}
            />
          </EuiText>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SLOSortBy state={state} onStateChange={onStateChange} loading={loading} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SloGroupBy state={state} onStateChange={onStateChange} loading={loading} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          buttonSize="compressed"
          legend={i18n.translate('xpack.slo.toggleSLOView.euiButtonGroup.sloView', {
            defaultMessage: 'SLO View',
          })}
          options={toggleButtonsIcons}
          idSelected={sloView}
          onChange={(id) => onChangeView(id as SLOView)}
          isIconOnly
          isDisabled={loading}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
