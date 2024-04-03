/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import type { EuiDataGridSorting, EuiDataGridSchemaDetector } from '@elastic/eui';
import { EuiButtonIcon, EuiCheckbox, EuiToolTip, useDataGridColumnSorting } from '@elastic/eui';
import { useDispatch } from 'react-redux';

import styled from 'styled-components';
import type { HeaderActionProps, SortDirection } from '../../../../common/types';
import { TimelineTabs, TimelineId } from '../../../../common/types';
import { isFullScreen } from '../../../timelines/components/timeline/body/column_headers';
import { isActiveTimeline } from '../../../helpers';
import { getColumnHeader } from '../../../timelines/components/timeline/body/column_headers/helpers';
import { timelineActions, timelineSelectors } from '../../../timelines/store';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { useGlobalFullScreen, useTimelineFullScreen } from '../../containers/use_full_screen';
import { useKibana } from '../../lib/kibana';
import { DEFAULT_ACTION_BUTTON_WIDTH } from '.';
import { EventsTh, EventsThContent } from '../../../timelines/components/timeline/styles';
import { StatefulRowRenderersBrowser } from '../../../timelines/components/row_renderers_browser';
import { EXIT_FULL_SCREEN } from '../exit_full_screen/translations';
import { EventsSelect } from '../../../timelines/components/timeline/body/column_headers/events_select';
import * as i18n from './translations';

const SortingColumnsContainer = styled.div`
  button {
    color: ${({ theme }) => theme.eui.euiColorPrimary};
  }

  .euiPopover .euiButtonEmpty {
    padding: 0;

    .euiButtonEmpty__text {
      display: none;
    }
  }
`;

const FieldBrowserContainer = styled.div`
  .euiToolTipAnchor {
    .euiButtonContent {
      padding: ${({ theme }) => `0 ${theme.eui.euiSizeXS}`};
    }
    button {
      color: ${({ theme }) => theme.eui.euiColorPrimary};
    }
    .euiButtonContent__icon {
      width: 16px;
      height: 16px;
    }
    .euiButtonEmpty__text {
      display: none;
    }
  }
`;

const ActionsContainer = styled.div`
  align-items: center;
  display: flex;
`;

// Defined statically to reduce rerenders
const emptySchema = {};
const emptySchemaDetectors: EuiDataGridSchemaDetector[] = [];

const HeaderActionsComponent: React.FC<HeaderActionProps> = ({
  width,
  browserFields,
  columnHeaders,
  isEventViewer = false,
  isSelectAllChecked,
  onSelectAll,
  showEventsSelect,
  showSelectAllCheckbox,
  sort,
  tabType,
  timelineId,
  fieldBrowserOptions,
}) => {
  const { triggersActionsUi } = useKibana().services;
  const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();
  const { timelineFullScreen, setTimelineFullScreen } = useTimelineFullScreen();
  const dispatch = useDispatch();

  const getManageTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { defaultColumns } = useDeepEqualSelector((state) => getManageTimeline(state, timelineId));

  const toggleFullScreen = useCallback(() => {
    if (timelineId === TimelineId.active) {
      setTimelineFullScreen(!timelineFullScreen);
    } else {
      setGlobalFullScreen(!globalFullScreen);
    }
  }, [
    timelineId,
    setTimelineFullScreen,
    timelineFullScreen,
    setGlobalFullScreen,
    globalFullScreen,
  ]);

  const fullScreen = useMemo(
    () =>
      isFullScreen({
        globalFullScreen,
        isActiveTimelines: isActiveTimeline(timelineId),
        timelineFullScreen,
      }),
    [globalFullScreen, timelineFullScreen, timelineId]
  );
  const handleSelectAllChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSelectAll({ isSelected: event.currentTarget.checked });
    },
    [onSelectAll]
  );

  const onSortColumns = useCallback(
    (cols: EuiDataGridSorting['columns']) => {
      console.log('Header Actions Sort : ', { cols });
      dispatch(
        timelineActions.updateSort({
          id: timelineId,
          sort: cols.map(({ id, direction }) => {
            const columnHeader = columnHeaders.find((ch) => ch.id === id);
            const columnType = columnHeader?.type ?? '';
            const esTypes = columnHeader?.esTypes ?? [];

            return {
              columnId: id,
              columnType,
              esTypes,
              sortDirection: direction as SortDirection,
            };
          }),
        })
      );
    },
    [columnHeaders, dispatch, timelineId]
  );

  const sortedColumns = useMemo(
    () => ({
      onSort: onSortColumns,
      columns:
        sort?.map<{ id: string; direction: 'asc' | 'desc' }>(({ columnId, sortDirection }) => ({
          id: columnId,
          direction: sortDirection as 'asc' | 'desc',
        })) ?? [],
    }),
    [onSortColumns, sort]
  );
  const displayValues = useMemo(
    () =>
      columnHeaders?.reduce((acc, ch) => ({ ...acc, [ch.id]: ch.displayAsText ?? ch.id }), {}) ??
      {},
    [columnHeaders]
  );

  const myColumns = useMemo(
    () =>
      columnHeaders?.map(({ aggregatable, displayAsText, id, type }) => ({
        id,
        isSortable: aggregatable,
        displayAsText,
        schema: type,
      })) ?? [],
    [columnHeaders]
  );

  console.log('Header : ', { myColumns });

  const onResetColumns = useCallback(() => {
    dispatch(timelineActions.updateColumns({ id: timelineId, columns: defaultColumns }));
  }, [defaultColumns, dispatch, timelineId]);

  const onToggleColumn = useCallback(
    (columnId: string) => {
      if (columnHeaders.some(({ id }) => id === columnId)) {
        dispatch(
          timelineActions.removeColumn({
            columnId,
            id: timelineId,
          })
        );
      } else {
        dispatch(
          timelineActions.upsertColumn({
            column: getColumnHeader(columnId, defaultColumns),
            id: timelineId,
            index: 1,
          })
        );
      }
    },
    [columnHeaders, dispatch, timelineId, defaultColumns]
  );

  const ColumnSorting = useDataGridColumnSorting({
    columns: myColumns,
    sorting: sortedColumns,
    schema: emptySchema,
    schemaDetectors: emptySchemaDetectors,
    displayValues,
  });

  return (
    <ActionsContainer>
      {showSelectAllCheckbox && (
        <EventsTh role="checkbox">
          <EventsThContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
            <EuiCheckbox
              data-test-subj="select-all-events"
              id={'select-all-events'}
              checked={isSelectAllChecked}
              onChange={handleSelectAllChange}
            />
          </EventsThContent>
        </EventsTh>
      )}

      <EventsTh role="button">
        <FieldBrowserContainer>
          {triggersActionsUi.getFieldBrowser({
            browserFields,
            columnIds: columnHeaders.map(({ id }) => id),
            onResetColumns,
            onToggleColumn,
            options: fieldBrowserOptions,
          })}
        </FieldBrowserContainer>
      </EventsTh>

      <EventsTh role="button">
        <StatefulRowRenderersBrowser
          data-test-subj="row-renderers-browser"
          timelineId={timelineId}
        />
      </EventsTh>

      <EventsTh role="button">
        <EventsThContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
          <EuiToolTip content={fullScreen ? EXIT_FULL_SCREEN : i18n.FULL_SCREEN}>
            <EuiButtonIcon
              aria-label={
                isFullScreen({
                  globalFullScreen,
                  isActiveTimelines: isActiveTimeline(timelineId),
                  timelineFullScreen,
                })
                  ? EXIT_FULL_SCREEN
                  : i18n.FULL_SCREEN
              }
              display={fullScreen ? 'fill' : 'empty'}
              color="primary"
              data-test-subj={
                // a full screen button gets created for timeline and for the host page
                // this sets the data-test-subj for each case so that tests can differentiate between them
                isActiveTimeline(timelineId) ? 'full-screen-active' : 'full-screen'
              }
              iconType="fullScreen"
              onClick={toggleFullScreen}
            />
          </EuiToolTip>
        </EventsThContent>
      </EventsTh>
      {tabType !== TimelineTabs.eql && (
        <EventsTh role="button" data-test-subj="timeline-sorting-fields">
          <EventsThContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
            <EuiToolTip content={i18n.SORT_FIELDS}>
              <SortingColumnsContainer>{ColumnSorting}</SortingColumnsContainer>
            </EuiToolTip>
          </EventsThContent>
        </EventsTh>
      )}

      {showEventsSelect && (
        <EventsTh role="button">
          <EventsThContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
            <EventsSelect checkState="unchecked" timelineId={timelineId} />
          </EventsThContent>
        </EventsTh>
      )}
    </ActionsContainer>
  );
};
HeaderActionsComponent.displayName = 'HeaderActionsComponent';

export const HeaderActions = React.memo(HeaderActionsComponent);
