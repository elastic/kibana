/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';

import { ViewSelection } from '../components/t_grid/event_rendered_view/selector';
import type { ControlColumnProps } from '../../common/types/timeline';
import { AlertStatus, CustomBulkActionProp } from '../../common/types/timeline/actions';
import {
  ALERTS_TABLE_VIEW_SELECTION_KEY,
  getDefaultViewSelection,
} from '../components/t_grid/helpers';

export interface TGridComponentState {
  /** The actions column */
  customActionsColum?: {
    renderer: (props: EuiDataGridCellValueElementProps) => ReactNode;
    width: number;
  };

  /** Additional bulk actions */
  customBulkActions?: CustomBulkActionProp[];

  /** The alert filter status that has been selected */
  filterStatus?: AlertStatus;

  /** The current filter query */
  filterQuery?: string;

  /** The current indix/indices */
  indexName: string;

  /** Row action itmes */
  leadingControlColumns?: ControlColumnProps[];

  /** Whether to show alert status bulk actions */
  showAlertStatusActions: boolean;

  /** The current timeline id */
  timelineId?: string;

  /** Whether the table is rendering regular cells or it uses event renderers */
  viewSelection: ViewSelection;
  setViewSelection: (newViewSelection: ViewSelection) => void;
}

const TGridComponentStateContext = createContext<TGridComponentState>({
  customBulkActions: [],
  filterStatus: 'open',
  indexName: '',
  showAlertStatusActions: false,
  viewSelection: 'gridView',
  setViewSelection: () => {},
});

export const useTGridComponentState = () => {
  return useContext(TGridComponentStateContext);
};

const storage = new Storage(localStorage);

export const TGridComponentStateProvider: React.FC<
  Pick<
    TGridComponentState,
    | 'customActionsColum'
    | 'customBulkActions'
    | 'filterStatus'
    | 'filterQuery'
    | 'indexName'
    | 'showAlertStatusActions'
    | 'timelineId'
  >
> = ({
  children,
  customActionsColum,
  customBulkActions,
  filterStatus,
  filterQuery,
  indexName,
  showAlertStatusActions,
  timelineId,
}) => {
  const [viewSelection, setViewSelection] = useState<ViewSelection>(() =>
    getDefaultViewSelection({
      timelineId: timelineId ?? '',
      value: storage.get(ALERTS_TABLE_VIEW_SELECTION_KEY),
    })
  );

  const providerValue: TGridComponentState = useMemo(() => {
    return {
      customActionsColum,
      customBulkActions,
      filterStatus,
      filterQuery,
      indexName,
      showAlertStatusActions,
      timelineId,
      viewSelection,
      setViewSelection,
    };
  }, [
    customActionsColum,
    customBulkActions,
    filterStatus,
    filterQuery,
    indexName,
    showAlertStatusActions,
    timelineId,
    viewSelection,
  ]);

  return (
    <TGridComponentStateContext.Provider value={providerValue}>
      {children}
    </TGridComponentStateContext.Provider>
  );
};

TGridComponentStateProvider.displayName = 'TGridComponentStateProvider';
