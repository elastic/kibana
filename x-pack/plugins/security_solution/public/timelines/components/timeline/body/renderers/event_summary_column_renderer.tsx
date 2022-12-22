/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React from 'react';

import styled from 'styled-components';
import type { ColumnHeaderOptions, RowRenderer } from '../../../../../../common/types';
import type { Ecs } from '../../../../../../common/ecs';
import type { ColumnRenderer } from './column_renderer';
import { EVENT_SUMMARY_FIELD_NAME } from './constants';
import { getRowRenderer } from './get_row_renderer';
const EventRenderedFlexItem = styled(EuiFlexItem)`
  div:first-child {
    padding-left: 0px;
    div {
      margin: 0px;
    }
  }
`;

export const eventSummaryColumnRenderer: ColumnRenderer = {
  isInstance: isEqual(EVENT_SUMMARY_FIELD_NAME),

  renderColumn: ({
    ecsData,
    scopeId,
    values,
    rowRenderers,
  }: {
    columnName: string;
    ecsData?: Ecs;
    eventId: string;
    field: ColumnHeaderOptions;
    isDetails?: boolean;
    isDraggable?: boolean;
    linkValues?: string[] | null | undefined;
    rowRenderers?: RowRenderer[];
    scopeId: string;
    truncate?: boolean;
    values: string[] | undefined | null;
  }) => {
    if (ecsData && rowRenderers) {
      const rowRenderer =
        getRowRenderer != null
          ? getRowRenderer({ data: ecsData, rowRenderers })
          : rowRenderers.find((x) => x.isInstance(ecsData)) ?? null;
      return (
        <EuiFlexGroup gutterSize="none" direction="column" className="eui-fullWidth">
          {rowRenderer != null ? (
            <EventRenderedFlexItem className="eui-xScroll">
              <div className="eui-displayBlock">
                {rowRenderer &&
                  rowRenderer.renderRow({
                    data: ecsData,
                    isDraggable: false,
                    scopeId,
                  })}
              </div>
            </EventRenderedFlexItem>
          ) : (
            <>{values && <EuiFlexItem data-test-subj="plain-text-reason">{values}</EuiFlexItem>}</>
          )}
        </EuiFlexGroup>
      );
    } else {
      return (
        <EuiFlexGroup gutterSize="none" direction="column" className="eui-fullWidth">
          {values && <EuiFlexItem data-test-subj="plain-text-reason">{values}</EuiFlexItem>}
        </EuiFlexGroup>
      );
    }
  },
};
