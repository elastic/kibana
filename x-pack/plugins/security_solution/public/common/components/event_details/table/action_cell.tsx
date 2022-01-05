/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { HoverActions } from '../../hover_actions';
import { useKibana } from '../../../lib/kibana';
import { useActionCellDataProvider } from './use_action_cell_data_provider';
import { EnrichedFieldInfo } from '../types';
import { ColumnHeaderOptions } from '../../../../../common/types/timeline';

interface Props extends EnrichedFieldInfo {
  contextId: string;
  applyWidthAndPadding?: boolean;
  disabled?: boolean;
  getLinkValue?: (field: string) => string | null;
  onFilterAdded?: () => void;
  timelineId: string;
  toggleColumn?: (column: ColumnHeaderOptions) => void;
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

    const [showTopN, setShowTopN] = useState<boolean>(false);
    const [hoverActionsOwnFocus] = useState<boolean>(false);
    const toggleTopN = useCallback(() => {
      setShowTopN((prevShowTopN) => {
        const newShowTopN = !prevShowTopN;
        return newShowTopN;
      });
    }, []);

    const closeTopN = useCallback(() => {
      setShowTopN(false);
    }, []);
    const { filterManager } = useKibana().services.data.query;

    return (
      <HoverActions
        applyWidthAndPadding={applyWidthAndPadding}
        closeTopN={closeTopN}
        dataType={data.type}
        dataProvider={actionCellConfig?.dataProvider}
        enableOverflowButton={true}
        filterManager={filterManager}
        field={data.field}
        isObjectArray={data.isObjectArray}
        onFilterAdded={onFilterAdded}
        ownFocus={hoverActionsOwnFocus}
        showTopN={showTopN}
        timelineId={timelineId}
        toggleColumn={toggleColumn}
        toggleTopN={toggleTopN}
        values={actionCellConfig?.stringValues}
      />
    );
  }
);

ActionCell.displayName = 'ActionCell';
