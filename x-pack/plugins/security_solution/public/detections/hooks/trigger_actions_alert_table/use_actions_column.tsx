/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import React, { useCallback, useContext, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type {
  AlertsTableConfigurationRegistry,
  RenderCustomActionsRowArgs,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { TableId } from '@kbn/securitysolution-data-table';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { StatefulEventContext } from '../../../common/components/events_viewer/stateful_event_context';
import { eventsViewerSelector } from '../../../common/components/events_viewer/selectors';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { useLicense } from '../../../common/hooks/use_license';
import type { TimelineItem } from '../../../../common/search_strategy';
import { getAlertsDefaultModel } from '../../components/alerts_table/default_config';
import type { State } from '../../../common/store';
import { RowAction } from '../../../common/components/control_columns/row_action';

export const getUseActionColumnHook =
  (tableId: TableId): AlertsTableConfigurationRegistry['useActionsColumn'] =>
  () => {
    const license = useLicense();
    const isEnterprisePlus = license.isEnterprise();
    let ACTION_BUTTON_COUNT = tableId === TableId.alertsOnCasePage ? 4 : isEnterprisePlus ? 6 : 5;

    // we only want to show the note icon if the expandable flyout and the new notes system are enabled
    // TODO delete most likely in 8.16
    const securitySolutionNotesEnabled = useIsExperimentalFeatureEnabled(
      'securitySolutionNotesEnabled'
    );
    if (!securitySolutionNotesEnabled) {
      ACTION_BUTTON_COUNT--;
    }

    const eventContext = useContext(StatefulEventContext);

    const leadingControlColumn = useMemo(
      () => getDefaultControlColumn(ACTION_BUTTON_COUNT)[0],
      [ACTION_BUTTON_COUNT]
    );

    const {
      dataTable: {
        columns: columnHeaders,
        showCheckboxes,
        selectedEventIds,
        loadingEventIds,
      } = getAlertsDefaultModel(license),
    } = useSelector((state: State) => eventsViewerSelector(state, tableId));

    const renderCustomActionsRow = useCallback(
      ({
        rowIndex,
        cveProps,
        setIsActionLoading,
        refresh: alertsTableRefresh,
        clearSelection,
        ecsAlert: alert,
        nonEcsData,
      }: RenderCustomActionsRowArgs) => {
        const timelineItem: TimelineItem = {
          _id: (alert as Ecs)._id,
          _index: (alert as Ecs)._index,
          ecs: alert as Ecs,
          data: nonEcsData,
        };

        return (
          <RowAction
            columnId={`actions-${rowIndex}`}
            columnHeaders={columnHeaders}
            controlColumn={leadingControlColumn}
            data={timelineItem}
            disabled={false}
            index={rowIndex}
            isDetails={cveProps.isDetails}
            isExpanded={cveProps.isExpanded}
            isEventViewer={false}
            isExpandable={cveProps.isExpandable}
            loadingEventIds={loadingEventIds}
            onRowSelected={() => {}}
            rowIndex={cveProps.rowIndex}
            colIndex={cveProps.colIndex}
            pageRowIndex={rowIndex}
            selectedEventIds={selectedEventIds}
            setCellProps={cveProps.setCellProps}
            showCheckboxes={showCheckboxes}
            onRuleChange={eventContext?.onRuleChange}
            tabType={'query'}
            tableId={tableId}
            width={0}
            setEventsLoading={({ isLoading }) => {
              if (!isLoading) {
                clearSelection();
                return;
              }
              if (setIsActionLoading) setIsActionLoading(isLoading);
            }}
            setEventsDeleted={() => {}}
            refetch={alertsTableRefresh}
          />
        );
      },
      [
        columnHeaders,
        loadingEventIds,
        showCheckboxes,
        leadingControlColumn,
        selectedEventIds,
        eventContext,
      ]
    );

    return {
      renderCustomActionsRow,
      width: leadingControlColumn.width,
    };
  };
