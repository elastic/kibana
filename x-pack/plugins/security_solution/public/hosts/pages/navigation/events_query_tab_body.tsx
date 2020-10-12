/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { TimelineId } from '../../../../common/types/timeline';
import { StatefulEventsViewer } from '../../../common/components/events_viewer';
import { HostsComponentsQueryProps } from './types';
import { eventsDefaultModel } from '../../../common/components/events_viewer/default_model';
import {
  MatrixHistogramOption,
  MatrixHistogramConfigs,
} from '../../../common/components/matrix_histogram/types';
import { MatrixHistogram } from '../../../common/components/matrix_histogram';
import { useFullScreen } from '../../../common/containers/use_full_screen';
import * as i18n from '../translations';
import { MatrixHistogramType } from '../../../../common/search_strategy/security_solution';
import { useManageTimeline } from '../../../timelines/components/manage_timeline';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';

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

export const histogramConfigs: MatrixHistogramConfigs = {
  defaultStackByOption:
    eventsStackByOptions.find((o) => o.text === DEFAULT_STACK_BY) ?? eventsStackByOptions[0],
  errorMessage: i18n.ERROR_FETCHING_EVENTS_DATA,
  histogramType: MatrixHistogramType.events,
  stackByOptions: eventsStackByOptions,
  subtitle: undefined,
  title: i18n.NAVIGATION_EVENTS_TITLE,
};

const EventsQueryTabBodyComponent: React.FC<HostsComponentsQueryProps> = ({
  deleteQuery,
  endDate,
  filterQuery,
  indexNames,
  pageFilters,
  setQuery,
  startDate,
}) => {
  const dispatch = useDispatch();
  const { initializeTimeline } = useManageTimeline();
  const { globalFullScreen } = useFullScreen();
  useEffect(() => {
    initializeTimeline({
      id: TimelineId.hostsPageEvents,
      defaultModel: eventsDefaultModel,
    });
  }, [dispatch, initializeTimeline]);

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: EVENTS_HISTOGRAM_ID });
      }
    };
  }, [deleteQuery]);

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
        defaultModel={eventsDefaultModel}
        end={endDate}
        id={TimelineId.hostsPageEvents}
        scopeId={SourcererScopeName.default}
        start={startDate}
        pageFilters={pageFilters}
      />
    </>
  );
};

EventsQueryTabBodyComponent.displayName = 'EventsQueryTabBodyComponent';

export const EventsQueryTabBody = React.memo(EventsQueryTabBodyComponent);

EventsQueryTabBody.displayName = 'EventsQueryTabBody';
