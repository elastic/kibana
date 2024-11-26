/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, memo } from 'react';
import { EuiButtonIcon, EuiToolTip, EuiCheckbox } from '@elastic/eui';
import { useDispatch } from 'react-redux';

import styled from 'styled-components';
import { isFullScreen } from '../../../timelines/components/timeline/helpers';
import type { HeaderActionProps } from '../../../../common/types';
import { TimelineId } from '../../../../common/types';
import { isActiveTimeline } from '../../../helpers';
import { getColumnHeader } from '../../../timelines/components/timeline/body/column_headers/helpers';
import { timelineActions } from '../../../timelines/store';
import { useGlobalFullScreen, useTimelineFullScreen } from '../../containers/use_full_screen';
import { useKibana } from '../../lib/kibana';
import { DEFAULT_ACTION_BUTTON_WIDTH } from '.';
import { EventsTh, EventsThContent } from '../../../timelines/components/timeline/styles';
import { EXIT_FULL_SCREEN } from '../exit_full_screen/translations';
import { EventsSelect } from '../../../timelines/components/timeline/body/column_headers/events_select';
import * as i18n from './translations';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { selectTimelineById } from '../../../timelines/store/selectors';

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

const HeaderActionsComponent: React.FC<HeaderActionProps> = memo(
  ({
    browserFields,
    columnHeaders,
    isSelectAllChecked,
    onSelectAll,
    showEventsSelect,
    showSelectAllCheckbox,
    showFullScreenToggle = true,
    timelineId,
    fieldBrowserOptions,
  }) => {
    const { triggersActionsUi } = useKibana().services;
    const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();
    const { timelineFullScreen, setTimelineFullScreen } = useTimelineFullScreen();
    const dispatch = useDispatch();

    const { defaultColumns } = useDeepEqualSelector((state) =>
      selectTimelineById(state, timelineId)
    );

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

    return (
      <ActionsContainer data-test-subj="header-actions-container">
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
        {fieldBrowserOptions && (
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
        )}

        {showFullScreenToggle && (
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
  }
);
HeaderActionsComponent.displayName = 'HeaderActionsComponent';

export const HeaderActions = React.memo(HeaderActionsComponent);
