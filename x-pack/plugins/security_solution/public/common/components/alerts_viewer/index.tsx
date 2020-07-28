/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useCallback, useMemo } from 'react';
import numeral from '@elastic/numeral';
import { useWindowSize } from 'react-use';

import { globalHeaderHeightPx } from '../../../app/home';
import { DEFAULT_NUMBER_FORMAT, FILTERS_GLOBAL_HEIGHT } from '../../../../common/constants';
import { useFullScreen } from '../../containers/use_full_screen';
import { EVENTS_VIEWER_HEADER_HEIGHT } from '../events_viewer/events_viewer';
import {
  getEventsViewerBodyHeight,
  MIN_EVENTS_VIEWER_BODY_HEIGHT,
} from '../../../timelines/components/timeline/body/helpers';
import { footerHeight } from '../../../timelines/components/timeline/footer';

import { AlertsComponentsProps } from './types';
import { AlertsTable } from './alerts_table';
import * as i18n from './translations';
import { useUiSetting$ } from '../../lib/kibana';
import { MatrixHistogramContainer } from '../matrix_histogram';
import { histogramConfigs } from './histogram_configs';
import { MatrixHisrogramConfigs } from '../matrix_histogram/types';
const ID = 'alertsOverTimeQuery';

export const AlertsView = ({
  timelineId,
  deleteQuery,
  endDate,
  filterQuery,
  pageFilters,
  setQuery,
  startDate,
  type,
}: AlertsComponentsProps) => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const getSubtitle = useCallback(
    (totalCount: number) =>
      `${i18n.SHOWING}: ${numeral(totalCount).format(defaultNumberFormat)} ${i18n.UNIT(
        totalCount
      )}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const { height: windowHeight } = useWindowSize();
  const { globalFullScreen } = useFullScreen();
  const alertsHistogramConfigs: MatrixHisrogramConfigs = useMemo(
    () => ({
      ...histogramConfigs,
      subtitle: getSubtitle,
    }),
    [getSubtitle]
  );
  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, [deleteQuery]);

  return (
    <>
      {!globalFullScreen && (
        <MatrixHistogramContainer
          endDate={endDate}
          filterQuery={filterQuery}
          id={ID}
          setQuery={setQuery}
          sourceId="default"
          startDate={startDate}
          type={type}
          {...alertsHistogramConfigs}
        />
      )}
      <AlertsTable
        timelineId={timelineId}
        endDate={endDate}
        eventsViewerBodyHeight={
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
        startDate={startDate}
        pageFilters={pageFilters}
      />
    </>
  );
};
AlertsView.displayName = 'AlertsView';
