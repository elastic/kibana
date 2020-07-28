/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useWindowSize } from 'react-use';

import { TimelineId } from '../../../../common/types/timeline';
import { StatefulEventsViewer } from '../../../common/components/events_viewer';
import { HostsComponentsQueryProps } from './types';
import { hostsModel } from '../../store';
import { eventsDefaultModel } from '../../../common/components/events_viewer/default_model';
import {
  MatrixHistogramOption,
  MatrixHisrogramConfigs,
} from '../../../common/components/matrix_histogram/types';
import { MatrixHistogramContainer } from '../../../common/components/matrix_histogram';
import { useFullScreen } from '../../../common/containers/use_full_screen';
import * as i18n from '../translations';
import { HistogramType } from '../../../graphql/types';
import { useManageTimeline } from '../../../timelines/components/manage_timeline';
import {
  getEventsViewerBodyHeight,
  getInvestigateInResolverAction,
  MIN_EVENTS_VIEWER_BODY_HEIGHT,
} from '../../../timelines/components/timeline/body/helpers';
import { FILTERS_GLOBAL_HEIGHT } from '../../../../common/constants';
import { globalHeaderHeightPx } from '../../../app/home';
import { EVENTS_VIEWER_HEADER_HEIGHT } from '../../../common/components/events_viewer/events_viewer';
import { footerHeight } from '../../../timelines/components/timeline/footer';

const EVENTS_HISTOGRAM_ID = 'eventsOverTimeQuery';

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

export const histogramConfigs: MatrixHisrogramConfigs = {
  defaultStackByOption:
    eventsStackByOptions.find((o) => o.text === DEFAULT_STACK_BY) ?? eventsStackByOptions[0],
  errorMessage: i18n.ERROR_FETCHING_EVENTS_DATA,
  histogramType: HistogramType.events,
  stackByOptions: eventsStackByOptions,
  subtitle: undefined,
  title: i18n.NAVIGATION_EVENTS_TITLE,
};

export const EventsQueryTabBody = ({
  deleteQuery,
  endDate,
  filterQuery,
  pageFilters,
  setQuery,
  startDate,
}: HostsComponentsQueryProps) => {
  const { initializeTimeline } = useManageTimeline();
  const dispatch = useDispatch();
  const { height: windowHeight } = useWindowSize();
  const { globalFullScreen } = useFullScreen();
  useEffect(() => {
    initializeTimeline({
      id: TimelineId.hostsPageEvents,
      defaultModel: eventsDefaultModel,
      timelineRowActions: () => [
        getInvestigateInResolverAction({ dispatch, timelineId: TimelineId.hostsPageEvents }),
      ],
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
        <MatrixHistogramContainer
          endDate={endDate}
          filterQuery={filterQuery}
          setQuery={setQuery}
          sourceId="default"
          startDate={startDate}
          type={hostsModel.HostsType.page}
          id={EVENTS_HISTOGRAM_ID}
          {...histogramConfigs}
        />
      )}
      <StatefulEventsViewer
        defaultModel={eventsDefaultModel}
        end={endDate}
        height={
          globalFullScreen
            ? getEventsViewerBodyHeight({
                footerHeight,
                headerHeight: EVENTS_VIEWER_HEADER_HEIGHT,
                kibanaChromeHeight: globalHeaderHeightPx,
                otherContentHeight: FILTERS_GLOBAL_HEIGHT,
                windowHeight,
              })
            : MIN_EVENTS_VIEWER_BODY_HEIGHT
        }
        id={TimelineId.hostsPageEvents}
        start={startDate}
        pageFilters={pageFilters}
      />
    </>
  );
};

EventsQueryTabBody.displayName = 'EventsQueryTabBody';
