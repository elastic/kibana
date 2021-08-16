/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useRef } from 'react';
import { HoverActions } from '../../hover_actions';
import { useActionCellDataProvider } from './use_action_cell_data_provider';
import { EventFieldsData, FieldsData } from '../types';
import { useGetTimelineId } from '../../drag_and_drop/use_get_timeline_id_from_dom';
import { ColumnHeaderOptions } from '../../../../../common/types/timeline';
import { BrowserField } from '../../../containers/source';

interface Props {
  contextId: string;
  data: FieldsData | EventFieldsData;
  disabled?: boolean;
  eventId: string;
  fieldFromBrowserField?: BrowserField;
  getLinkValue?: (field: string) => string | null;
  linkValue?: string | null | undefined;
  onFilterAdded?: () => void;
  timelineId?: string;
  toggleColumn?: (column: ColumnHeaderOptions) => void;
  values: string[] | null | undefined;
}

export const ActionCell: React.FC<Props> = React.memo(
  ({
    contextId,
    data,
    eventId,
    fieldFromBrowserField,
    getLinkValue,
    linkValue,
    onFilterAdded,
    timelineId,
    toggleColumn,
    values,
  }) => {
    const actionCellConfig = useActionCellDataProvider({
      contextId,
      eventId,
      field: data.field,
      fieldFormat: data.format,
      fieldFromBrowserField,
      fieldType: data.type,
      isObjectArray: data.isObjectArray,
      linkValue: (getLinkValue && getLinkValue(data.field)) ?? linkValue,
      values,
    });

    const draggableRef = useRef<HTMLDivElement | null>(null);
    const [showTopN, setShowTopN] = useState<boolean>(false);
    const [goGetTimelineId, setGoGetTimelineId] = useState(false);
    const timelineIdFind = useGetTimelineId(draggableRef, goGetTimelineId);
    const [hoverActionsOwnFocus] = useState<boolean>(false);

    const toggleTopN = useCallback(() => {
      setShowTopN((prevShowTopN) => {
        const newShowTopN = !prevShowTopN;
        return newShowTopN;
      });
    }, []);

    return (
      <HoverActions
        dataType={data.type}
        dataProvider={actionCellConfig?.dataProvider}
        field={data.field}
        goGetTimelineId={setGoGetTimelineId}
        isObjectArray={data.isObjectArray}
        onFilterAdded={onFilterAdded}
        ownFocus={hoverActionsOwnFocus}
        showTopN={showTopN}
        timelineId={timelineId ?? timelineIdFind}
        toggleColumn={toggleColumn}
        toggleTopN={toggleTopN}
        values={actionCellConfig?.stringValues}
      />
    );
  }
);

ActionCell.displayName = 'ActionCell';
