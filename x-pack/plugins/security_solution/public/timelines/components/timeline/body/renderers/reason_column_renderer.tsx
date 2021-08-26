/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';

import styled from 'styled-components';
import { BrowserFields, ColumnHeaderOptions, RowRenderer } from '../../../../../../common';
import { Ecs } from '../../../../../../common/ecs';
import { eventRendererNames } from '../../../row_renderers_browser/catalog/constants';
import { ColumnRenderer } from './column_renderer';
import { REASON_FIELD_NAME } from './constants';
import { getRowRenderer } from './get_row_renderer';
import { plainColumnRenderer } from './plain_column_renderer';
import * as i18n from './translations';

export const reasonColumnRenderer: ColumnRenderer = {
  isInstance: isEqual(REASON_FIELD_NAME),

  renderColumn: ({
    columnName,
    eventId,
    field,
    isDraggable = true,
    timelineId,
    truncate,
    values,
    linkValues,
    ecsData,
    rowRenderers = [],
    browserFields,
  }: {
    columnName: string;
    eventId: string;
    field: ColumnHeaderOptions;
    isDraggable?: boolean;
    timelineId: string;
    truncate?: boolean;
    values: string[] | undefined | null;
    linkValues?: string[] | null | undefined;

    ecsData?: Ecs;
    rowRenderers?: RowRenderer[];
    browserFields?: BrowserFields;
  }) =>
    values != null && ecsData && rowRenderers?.length > 0 && browserFields
      ? values.map((value, i) => (
          <ReasonCell
            key={`reason-column-renderer-value-${timelineId}-${columnName}-${eventId}-${field.id}-${value}-${i}`}
            timelineId={timelineId}
            value={value}
            ecsData={ecsData}
            rowRenderers={rowRenderers}
            browserFields={browserFields}
          />
        ))
      : plainColumnRenderer.renderColumn({
          columnName,
          eventId,
          field,
          isDraggable,
          timelineId,
          truncate,
          values,
          linkValues,
        }),
};

const StyledEuiButtonEmpty = styled(EuiButtonEmpty)`
  font-weight: ${(props) => props.theme.eui.euiFontWeightRegular};
`;

const ReasonCell: React.FC<{
  value: string | number | undefined | null;
  timelineId: string;
  ecsData: Ecs;
  rowRenderers: RowRenderer[];
  browserFields: BrowserFields;
}> = ({ ecsData, rowRenderers, browserFields, timelineId, value }) => {
  const [isOpen, setIsOpen] = useState(false);

  const rowRenderer = useMemo(() => getRowRenderer(ecsData, rowRenderers), [ecsData, rowRenderers]);

  const rowRender = useMemo(() => {
    return (
      rowRenderer &&
      rowRenderer.renderRow({
        browserFields,
        data: ecsData,
        isDraggable: false,
        timelineId,
      })
    );
  }, [rowRenderer, browserFields, ecsData, timelineId]);

  const handleTogglePopOver = useCallback(() => setIsOpen(!isOpen), [setIsOpen, isOpen]);
  const handleClosePopOver = useCallback(() => setIsOpen(false), [setIsOpen]);

  const button = useMemo(
    () => (
      <StyledEuiButtonEmpty
        data-test-subj="reason-cell-button"
        size="xs"
        flush="left"
        onClick={handleTogglePopOver}
      >
        {value}
      </StyledEuiButtonEmpty>
    ),
    [value, handleTogglePopOver]
  );

  return (
    <>
      {rowRenderer && rowRender ? (
        <EuiPopover
          isOpen={isOpen}
          anchorPosition="rightCenter"
          closePopover={handleClosePopOver}
          button={button}
        >
          <EuiPopoverTitle paddingSize="s">
            {i18n.EVENT_RENDERER_POPOVER_TITLE(eventRendererNames[rowRenderer.id] ?? '')}
          </EuiPopoverTitle>
          {rowRender}
        </EuiPopover>
      ) : (
        value
      )}
    </>
  );
};
