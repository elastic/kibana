/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { Filter } from '@kbn/es-query';
import { TimelineId } from '../../../../common/types/timeline';
import { StatefulEventsViewer } from '../events_viewer';
import { timelineActions } from '../../../timelines/store/timeline';
import { eventsDefaultModel } from '../events_viewer/default_model';

import { MatrixHistogram } from '../matrix_histogram';
import { useGlobalFullScreen } from '../../containers/use_full_screen';
import * as i18n from '../../../hosts/pages/translations';
import { MatrixHistogramType } from '../../../../common/search_strategy/security_solution';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { getEventsHistogramLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/hosts/events';
import { defaultCellActions } from '../../lib/cell_actions/default_cell_actions';
import { GlobalTimeArgs } from '../../containers/use_global_time';
import { MatrixHistogramConfigs, MatrixHistogramOption } from '../matrix_histogram/types';
import { QueryTabBodyProps as UserQueryTabBodyProps } from '../../../users/pages/navigation/types';
import { QueryTabBodyProps as HostQueryTabBodyProps } from '../../../hosts/pages/navigation/types';

const EVENTS_HISTOGRAM_ID = 'eventsHistogramQuery';

export const eventsStackByOptions: MatrixHistogramOption[] = [
  {
    text: 'event.action',
    value: 'event.action',
  },
  {
    text: 'event.dataset',
    value: 'event.dataset',
  },
  {
    text: 'event.module',
    value: 'event.module',
  },
];

const DEFAULT_STACK_BY = 'event.action';
const unit = (n: number) => i18n.EVENTS_UNIT(n);

export const histogramConfigs: MatrixHistogramConfigs = {
  defaultStackByOption:
    eventsStackByOptions.find((o) => o.text === DEFAULT_STACK_BY) ?? eventsStackByOptions[0],
  errorMessage: i18n.ERROR_FETCHING_EVENTS_DATA,
  histogramType: MatrixHistogramType.events,
  stackByOptions: eventsStackByOptions,
  subtitle: undefined,
  title: i18n.NAVIGATION_EVENTS_TITLE,
  getLensAttributes: getEventsHistogramLensAttributes,
};

type QueryTabBodyProps = UserQueryTabBodyProps | HostQueryTabBodyProps;

export type EventsQueryTabBodyComponentProps = QueryTabBodyProps & {
  deleteQuery?: GlobalTimeArgs['deleteQuery'];
  indexNames: string[];
  pageFilters?: Filter[];
  setQuery: GlobalTimeArgs['setQuery'];
  timelineId: TimelineId;
};

const EventsQueryTabBodyComponent: React.FC<EventsQueryTabBodyComponentProps> = ({
  deleteQuery,
  endDate,
  filterQuery,
  indexNames,
  pageFilters,
  setQuery,
  startDate,
  timelineId,
}) => {
  const dispatch = useDispatch();
  const { globalFullScreen } = useGlobalFullScreen();
  const ACTION_BUTTON_COUNT = 4;
  const tGridEnabled = useIsExperimentalFeatureEnabled('tGridEnabled');

  useEffect(() => {
    dispatch(
      timelineActions.initializeTGridSettings({
        id: timelineId,
        defaultColumns: eventsDefaultModel.columns.map((c) =>
          !tGridEnabled && c.initialWidth == null
            ? {
                ...c,
                initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
              }
            : c
        ),
      })
    );
  }, [dispatch, tGridEnabled, timelineId]);

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: EVENTS_HISTOGRAM_ID });
      }
    };
  }, [deleteQuery]);

  const leadingControlColumns = useMemo(() => getDefaultControlColumn(ACTION_BUTTON_COUNT), []);

  return (
    <>
      {!globalFullScreen && (
        <MatrixHistogram
          endDate={endDate}
          filterQuery={filterQuery}
          setQuery={setQuery}
          startDate={startDate}
          id={EVENTS_HISTOGRAM_ID}
          indexNames={indexNames}
          {...histogramConfigs}
        />
      )}
      <StatefulEventsViewer
        defaultCellActions={defaultCellActions}
        defaultModel={eventsDefaultModel}
        end={endDate}
        entityType="events"
        id={timelineId}
        leadingControlColumns={leadingControlColumns}
        pageFilters={pageFilters}
        renderCellValue={DefaultCellRenderer}
        rowRenderers={defaultRowRenderers}
        scopeId={SourcererScopeName.default}
        start={startDate}
        unit={unit}
      />
    </>
  );
};

EventsQueryTabBodyComponent.displayName = 'EventsQueryTabBodyComponent';

export const EventsQueryTabBody = React.memo(EventsQueryTabBodyComponent);

EventsQueryTabBody.displayName = 'EventsQueryTabBody';
