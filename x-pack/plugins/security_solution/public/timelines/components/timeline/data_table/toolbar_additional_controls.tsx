/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import React, { useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { i18n } from '@kbn/i18n';
import { FULL_SCREEN_TOGGLED_CLASS_NAME } from '../../../../../common/constants';
import { EXIT_FULL_SCREEN } from '../../../../common/components/exit_full_screen/translations';
import { isActiveTimeline } from '../../../../helpers';
import { timelineActions } from '../../../store/timeline';
import { useKibana } from '../../../../common/lib/kibana';
import { defaultHeaders } from '../body/column_headers/default_headers';
import type { ColumnHeaderOptions } from '../../../../../common/types/timeline';
import { TimelineId } from '../../../../../common/types/timeline';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import {
  useGlobalFullScreen,
  useTimelineFullScreen,
} from '../../../../common/containers/use_full_screen';
import { useFieldBrowserOptions } from '../../fields_browser';
import { getColumnHeader } from '../body/column_headers/helpers';
import { StatefulRowRenderersBrowser } from '../../row_renderers_browser';

export const FULL_SCREEN = i18n.translate('xpack.securitySolution.timeline.fullScreenButton', {
  defaultMessage: 'Full screen',
});

export const isFullScreen = ({
  globalFullScreen,
  isActiveTimelines,
  timelineFullScreen,
}: {
  globalFullScreen: boolean;
  isActiveTimelines: boolean;
  timelineFullScreen: boolean;
}) =>
  (isActiveTimelines && timelineFullScreen) || (isActiveTimelines === false && globalFullScreen);

interface Props {
  timelineId: string;
  columns: ColumnHeaderOptions[];
}

export const ToolbarAdditionalControlsComponent: React.FC<Props> = ({ columns, timelineId }) => {
  const dispatch = useDispatch();
  const {
    services: { triggersActionsUi },
  } = useKibana();
  const { timelineFullScreen, setTimelineFullScreen } = useTimelineFullScreen();

  const defaultColumns = useMemo(() => {
    return columns.map((c) => c.id);
  }, [columns]);
  const { browserFields } = useSourcererDataView(SourcererScopeName.timeline);

  const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();

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

  const fieldBrowserOptions = useFieldBrowserOptions({
    sourcererScope: SourcererScopeName.timeline,
    upsertColumn: (columnR: ColumnHeaderOptions, indexR: number) =>
      dispatch(timelineActions.upsertColumn({ column: columnR, id: timelineId, index: indexR })),
    removeColumn: (columnId: string) =>
      dispatch(timelineActions.removeColumn({ columnId, id: timelineId })),
  });

  const onResetColumns = useCallback(() => {
    dispatch(timelineActions.updateColumns({ id: timelineId, columns }));
  }, [columns, dispatch, timelineId]);

  const onToggleColumn = useCallback(
    (columnId: string) => {
      if (columns.some(({ id }) => id === columnId)) {
        dispatch(
          timelineActions.removeColumn({
            columnId,
            id: timelineId,
          })
        );
      } else {
        dispatch(
          timelineActions.upsertColumn({
            column: getColumnHeader(columnId, defaultHeaders),
            id: timelineId,
            index: 1,
          })
        );
      }
    },
    [columns, dispatch, timelineId]
  );

  return (
    <>
      {' '}
      {triggersActionsUi.getFieldBrowser({
        browserFields,
        columnIds: defaultColumns ?? [],
        onResetColumns,
        onToggleColumn,
        options: fieldBrowserOptions,
      })}
      <StatefulRowRenderersBrowser data-test-subj="row-renderers-browser" timelineId={timelineId} />
      <>
        <EuiToolTip content={fullScreen ? EXIT_FULL_SCREEN : FULL_SCREEN}>
          <EuiButtonIcon
            aria-label={
              isFullScreen({
                globalFullScreen,
                isActiveTimelines: isActiveTimeline(timelineId),
                timelineFullScreen,
              })
                ? EXIT_FULL_SCREEN
                : FULL_SCREEN
            }
            className={fullScreen ? FULL_SCREEN_TOGGLED_CLASS_NAME : ''}
            color={fullScreen ? 'ghost' : 'primary'}
            data-test-subj={
              // a full screen button gets created for timeline and for the host page
              // this sets the data-test-subj for each case so that tests can differentiate between them
              isActiveTimeline(timelineId) ? 'full-screen-active' : 'full-screen'
            }
            iconType="fullScreen"
            onClick={toggleFullScreen}
          />
        </EuiToolTip>
      </>
    </>
  );
};

export const ToolbarAdditionalControls = React.memo(ToolbarAdditionalControlsComponent);
// eslint-disable-next-line import/no-default-export
export { ToolbarAdditionalControls as default };
