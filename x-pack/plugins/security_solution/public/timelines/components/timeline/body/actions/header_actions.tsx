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
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { EXIT_FULL_SCREEN } from '../../../../../common/components/exit_full_screen/translations';
import { FULL_SCREEN_TOGGLED_CLASS_NAME } from '../../../../../../common/constants';
import {
  useGlobalFullScreen,
  useTimelineFullScreen,
} from '../../../../../common/containers/use_full_screen';
import { BrowserFields } from '../../../../../common/containers/source';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import { OnSelectAll } from '../../events';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../helpers';
import { StatefulFieldsBrowser } from '../../../fields_browser';
import { StatefulRowRenderersBrowser } from '../../../row_renderers_browser';
import { FIELD_BROWSER_HEIGHT, FIELD_BROWSER_WIDTH } from '../../../fields_browser/helpers';
import { EventsTh, EventsThContent } from '../../styles';
import { Sort, SortDirection } from '../sort';
import { EventsSelect } from '../column_headers/events_select';
import * as i18n from '../column_headers/translations';
import { timelineActions } from '../../../../store/timeline';
import { isFullScreen } from '../column_headers';

export interface HeaderActionProps {
  width: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  isEventViewer?: boolean;
  isSelectAllChecked: boolean;
  onSelectAll: OnSelectAll;
  showEventsSelect: boolean;
  showSelectAllCheckbox: boolean;
  sort: Sort[];
  tabType: TimelineTabs;
  timelineId: string;
}

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
}) => {
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
      columns: sort.map<{ id: string; direction: 'asc' | 'desc' }>(
        ({ columnId, sortDirection }) => ({
          id: columnId,
          direction: sortDirection as 'asc' | 'desc',
        })
      ),
    }),
    [onSortColumns, sort]
  );
  const displayValues = useMemo(
    () => columnHeaders.reduce((acc, ch) => ({ ...acc, [ch.id]: ch.displayAsText ?? ch.id }), {}),
    [columnHeaders]
  );

  const myColumns = useMemo(
    () =>
      columnHeaders.map(({ aggregatable, displayAsText, id, type }) => ({
        id,
        isSortable: aggregatable,
        displayAsText,
        schema: type,
      })),
    [columnHeaders]
  );

  const ColumnSorting = useDataGridColumnSorting(myColumns, sortedColumns, {}, [], displayValues);

  return (
    <>
      {showSelectAllCheckbox && (
        <EventsTh role="checkbox">
          <EventsThContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
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
        <StatefulFieldsBrowser
          browserFields={browserFields}
          columnHeaders={columnHeaders}
          data-test-subj="field-browser"
          height={FIELD_BROWSER_HEIGHT}
          timelineId={timelineId}
          width={FIELD_BROWSER_WIDTH}
        />
      </EventsTh>

      <EventsTh role="button">
        <StatefulRowRenderersBrowser
          data-test-subj="row-renderers-browser"
          timelineId={timelineId}
        />
      </EventsTh>

      <EventsTh role="button">
        <EventsThContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
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
          <EventsThContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
            <EuiToolTip content={i18n.SORT_FIELDS}>
              <SortingColumnsContainer>{ColumnSorting}</SortingColumnsContainer>
            </EuiToolTip>
          </EventsThContent>
        </EventsTh>
      )}

      {showEventsSelect && (
        <EventsTh role="button">
          <EventsThContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
            <EventsSelect checkState="unchecked" timelineId={timelineId} />
          </EventsThContent>
        </EventsTh>
      )}
    </>
  );
};

HeaderActionsComponent.displayName = 'HeaderActionsComponent';

export const HeaderActions = React.memo(HeaderActionsComponent);
