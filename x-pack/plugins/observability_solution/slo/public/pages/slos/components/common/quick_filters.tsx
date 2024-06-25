/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { AwaitingControlGroupAPI, ControlGroupRenderer } from '@kbn/controls-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import styled from 'styled-components';
import { Filter } from '@kbn/es-query';
import { isEmpty } from 'lodash';
import { SearchState } from '../../hooks/use_url_search_state';

interface Props {
  initialState: SearchState;
  loading: boolean;
  dataView?: DataView;
  onStateChange: (newState: Partial<SearchState>) => void;
}

export function QuickFilters({
  dataView,
  initialState: { tagsFilter, statusFilter },
  onStateChange,
}: Props) {
  const [controlGroupAPI, setControlGroupAPI] = useState<AwaitingControlGroupAPI>();

  useEffect(() => {
    if (!controlGroupAPI) {
      return;
    }
    const subscription = controlGroupAPI.onFiltersPublished$.subscribe((newFilters) => {
      if (newFilters.length === 0) {
        onStateChange({ tagsFilter: undefined, statusFilter: undefined });
      } else {
        onStateChange({
          tagsFilter: newFilters.filter((filter) => filter.meta.key === 'slo.tags')?.[0],
          statusFilter: newFilters.filter((filter) => filter.meta.key === 'status')?.[0],
        });
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [controlGroupAPI, onStateChange]);

  if (!dataView) {
    return null;
  }

  return (
    <Container>
      <ControlGroupRenderer
        getCreationOptions={async (initialInput, builder) => {
          await builder.addOptionsListControl(initialInput, {
            dataViewId: dataView.id!,
            fieldName: 'status',
            width: 'small',
            grow: true,
            title: STATUS_LABEL,
            controlId: 'slo-status-filter',
            exclude: statusFilter?.meta?.negate,
            selectedOptions: getSelectedOptions(statusFilter),
            existsSelected: Boolean(statusFilter?.query?.exists?.field === 'status'),
            placeholder: ALL_LABEL,
          });
          await builder.addOptionsListControl(initialInput, {
            dataViewId: dataView.id!,
            title: TAGS_LABEL,
            fieldName: 'slo.tags',
            width: 'small',
            grow: false,
            controlId: 'slo-tags-filter',
            selectedOptions: getSelectedOptions(tagsFilter),
            exclude: statusFilter?.meta?.negate,
            existsSelected: Boolean(tagsFilter?.query?.exists?.field === 'slo.tags'),
            placeholder: ALL_LABEL,
          });
          return {
            initialInput: {
              ...initialInput,
              viewMode: ViewMode.VIEW,
            },
          };
        }}
        ref={setControlGroupAPI}
        timeRange={{ from: 'now-24h', to: 'now' }}
      />
    </Container>
  );
}

export const getSelectedOptions = (filter?: Filter) => {
  if (isEmpty(filter)) {
    return [];
  }
  if (filter?.meta?.params && Array.isArray(filter?.meta.params)) {
    return filter?.meta.params;
  }
  if (filter?.query?.match_phrase?.status) {
    return [filter.query.match_phrase.status];
  }
  if (filter?.query?.match_phrase?.['slo.tags']) {
    return [filter?.query.match_phrase?.['slo.tags']];
  }
  return [];
};

const Container = styled.div`
  .controlsWrapper {
    align-items: flex-start;
    min-height: initial;
  }
  .controlGroup {
    min-height: initial;
  }
`;

const TAGS_LABEL = i18n.translate('xpack.slo.list.tags', {
  defaultMessage: 'Tags',
});
const STATUS_LABEL = i18n.translate('xpack.slo.list.status', {
  defaultMessage: 'Status',
});
const ALL_LABEL = i18n.translate('xpack.slo.list.all', {
  defaultMessage: 'All',
});
