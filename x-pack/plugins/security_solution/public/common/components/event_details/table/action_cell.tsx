/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useContext } from 'react';
import { TimelineContext } from '../../../../timelines/components/timeline';
import { HoverActions } from '../../hover_actions';
import { useActionCellDataProvider } from './use_action_cell_data_provider';
import type { EnrichedFieldInfo } from '../types';
import type { ColumnHeaderOptions } from '../../../../../common/types/timeline';

interface Props extends EnrichedFieldInfo {
  contextId: string;
  applyWidthAndPadding?: boolean;
  disabled?: boolean;
  getLinkValue?: (field: string) => string | null;
  onFilterAdded?: () => void;
  setIsPopoverVisible?: (isVisible: boolean) => void;
  toggleColumn?: (column: ColumnHeaderOptions) => void;
  hideAddToTimeline?: boolean;
}

export const ActionCell: React.FC<Props> = React.memo(
  ({
    applyWidthAndPadding = true,
    contextId,
    data,
    eventId,
    fieldFromBrowserField,
    getLinkValue,
    linkValue,
    onFilterAdded,
    setIsPopoverVisible,
    scopeId,
    toggleColumn,
    values,
    hideAddToTimeline,
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

    const { aggregatable, type } = fieldFromBrowserField || { aggregatable: false, type: '' };

    const [showTopN, setShowTopN] = useState<boolean>(false);
    const { timelineId: timelineIdFind } = useContext(TimelineContext);
    const [hoverActionsOwnFocus] = useState<boolean>(false);
    const toggleTopN = useCallback(() => {
      setShowTopN((prevShowTopN) => {
        const newShowTopN = !prevShowTopN;
        if (setIsPopoverVisible) setIsPopoverVisible(newShowTopN);
        return newShowTopN;
      });
    }, [setIsPopoverVisible]);

    const closeTopN = useCallback(() => {
      setShowTopN(false);
    }, []);

    return (
      <HoverActions
        applyWidthAndPadding={applyWidthAndPadding}
        closeTopN={closeTopN}
        dataType={data.type}
        dataProvider={actionCellConfig?.dataProviders}
        enableOverflowButton={true}
        field={data.field}
        isAggregatable={aggregatable}
        fieldType={type}
        hideAddToTimeline={hideAddToTimeline}
        isObjectArray={data.isObjectArray}
        onFilterAdded={onFilterAdded}
        ownFocus={hoverActionsOwnFocus}
        showTopN={showTopN}
        scopeId={scopeId ?? timelineIdFind}
        toggleColumn={toggleColumn}
        toggleTopN={toggleTopN}
        values={actionCellConfig?.values}
      />
    );
  }
);

ActionCell.displayName = 'ActionCell';
