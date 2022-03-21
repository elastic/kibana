/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiDataGridSorting,
  EuiToolTip,
  useDataGridColumnSorting,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';

import styled from 'styled-components';
import {
  HeaderActionProps,
  SortDirection,
  TimelineId,
  TimelineTabs,
} from '../../../../../../common/types/timeline';
import { EXIT_FULL_SCREEN } from '../../../../../common/components/exit_full_screen/translations';
import { FULL_SCREEN_TOGGLED_CLASS_NAME } from '../../../../../../common/constants';
import {
  useGlobalFullScreen,
  useTimelineFullScreen,
} from '../../../../../common/containers/use_full_screen';
import { DEFAULT_ACTION_BUTTON_WIDTH } from '../../../../../../../timelines/public';
import { StatefulRowRenderersBrowser } from '../../../row_renderers_browser';
import { EventsTh, EventsThContent } from '../../styles';
import { EventsSelect } from '../column_headers/events_select';
import * as i18n from '../column_headers/translations';
import { timelineActions } from '../../../../store/timeline';
import { isFullScreen } from '../column_headers';
import { useKibana } from '../../../../../common/lib/kibana';

const SortingColumnsContainer = styled.div`
  button {
    color: ${({ theme }) => theme.eui.euiColorPrimary};
  }

  .euiPopover .euiButtonEmpty .euiButtonContent {
    padding: 0;

    .euiButtonEmpty__text {
      display: none;
    }
  }
`;

const FieldBrowserContainer = styled.div`
  .euiToolTipAnchor {
    .euiButtonContent {
      padding: ${({ theme }) => `0 ${theme.eui.paddingSizes.xs}`};
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
  const { timelines: timelinesUi } = useKibana().services;
  const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();
  const { timelineFullScreen, setTimelineFullScreen } = useTimelineFullScreen();
  const dispatch = useDispatch();
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
    () => isFullScreen({ globalFullScreen, timelineId, timelineFullScreen }),
    [globalFullScreen, timelineId, timelineFullScreen]
  );
  const handleSelectAllChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSelectAll({ isSelected: event.currentTarget.checked });
    },
    [onSelectAll]
  );

  const onSortColumns = useCallback(
    (cols: EuiDataGridSorting['columns']) =>
      dispatch(
        timelineActions.updateSort({
          id: timelineId,
          sort: cols.map(({ id, direction }) => ({
            columnId: id,
            columnType: columnHeaders.find((ch) => ch.id === id)?.type ?? 'text',
            sortDirection: direction as SortDirection,
          })),
        })
      ),
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

  const ColumnSorting = useDataGridColumnSorting(myColumns, sortedColumns, {}, [], displayValues);

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
          {timelinesUi.getFieldBrowser({
            browserFields,
            columnHeaders,
            timelineId,
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
                isFullScreen({ globalFullScreen, timelineId, timelineFullScreen })
                  ? EXIT_FULL_SCREEN
                  : i18n.FULL_SCREEN
              }
              className={fullScreen ? FULL_SCREEN_TOGGLED_CLASS_NAME : ''}
              color={fullScreen ? 'ghost' : 'primary'}
              data-test-subj={
                // a full screen button gets created for timeline and for the host page
                // this sets the data-test-subj for each case so that tests can differentiate between them
                timelineId === TimelineId.active ? 'full-screen-active' : 'full-screen'
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
