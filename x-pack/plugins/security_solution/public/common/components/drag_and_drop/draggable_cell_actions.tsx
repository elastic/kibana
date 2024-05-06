/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useContext, useMemo } from 'react';
import { TimelineId } from '../../../../common/types';
import type { SecurityCellActionsData } from '../cell_actions';
import {
  CellActionsMode,
  SecurityCellActions,
  SecurityCellActionsTrigger,
  SecurityCellActionType,
} from '../cell_actions';
import { getSourcererScopeId } from '../../../helpers';
import { TimelineContext } from '../../../timelines/components/timeline';

import { TableContext } from '../events_viewer/shared';

type DraggableCellActionsProps = PropsWithChildren<{
  data: SecurityCellActionsData | SecurityCellActionsData[];
  hideTopN?: boolean;
  scopeId?: string;
}>;

export const DraggableCellActions = React.memo<PropsWithChildren<DraggableCellActionsProps>>(
  ({ data, scopeId = TimelineId.active, children, hideTopN = false }) => {
    const { timelineId: timelineIdFind } = useContext(TimelineContext);
    const { tableId: tableIdFind } = useContext(TableContext);

    const sourcererScopeId = useMemo(() => {
      return getSourcererScopeId(scopeId ?? timelineIdFind ?? tableIdFind);
    }, [scopeId, tableIdFind, timelineIdFind]);

    const disabledActionTypes = useMemo(
      () => (hideTopN ? [SecurityCellActionType.SHOW_TOP_N] : []),
      [hideTopN]
    );

    return (
      <SecurityCellActions
        mode={CellActionsMode.HOVER_DOWN}
        visibleCellActions={6}
        showActionTooltips
        triggerId={SecurityCellActionsTrigger.DEFAULT}
        data={data}
        disabledActionTypes={disabledActionTypes}
        sourcererScopeId={sourcererScopeId}
        metadata={{ scopeId }}
        data-test-subj="draggableCellActions"
      >
        {children}
      </SecurityCellActions>
    );
  }
);

DraggableCellActions.displayName = 'DraggableCellActions';
