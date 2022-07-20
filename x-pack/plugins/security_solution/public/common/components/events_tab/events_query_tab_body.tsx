/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import numeral from '@elastic/numeral';

import { EuiCheckbox } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { EntityType } from '@kbn/timelines-plugin/common';

import type { TimelineId } from '../../../../common/types/timeline';
import { RowRendererId } from '../../../../common/types/timeline';
import { StatefulEventsViewer } from '../events_viewer';
import { timelineActions } from '../../../timelines/store/timeline';
import { eventsDefaultModel } from '../events_viewer/default_model';
import { MatrixHistogram } from '../matrix_histogram';
import { useGlobalFullScreen } from '../../containers/use_full_screen';
import * as i18n from '../../../hosts/pages/translations';
import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import { SHOWING, UNIT } from '../alerts_viewer/translations';
import { histogramConfigs as alertsHistogramConfig } from '../alerts_viewer/histogram_configs';
import { MatrixHistogramType } from '../../../../common/search_strategy/security_solution';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { getEventsHistogramLensAttributes } from '../visualization_actions/lens_attributes/hosts/events';
import { defaultCellActions } from '../../lib/cell_actions/default_cell_actions';
import type { GlobalTimeArgs } from '../../containers/use_global_time';
import type { MatrixHistogramConfigs, MatrixHistogramOption } from '../matrix_histogram/types';
import type { QueryTabBodyProps as UserQueryTabBodyProps } from '../../../users/pages/navigation/types';
import type { QueryTabBodyProps as HostQueryTabBodyProps } from '../../../hosts/pages/navigation/types';
import type { QueryTabBodyProps as NetworkQueryTabBodyProps } from '../../../network/pages/navigation/types';
import { alertsDefaultModel } from '../alerts_viewer/default_headers';
import { useUiSetting$ } from '../../lib/kibana';
import { defaultAlertsFilters } from '../events_viewer/external_alerts_filter';

const ALERTS_EVENTS_HISTOGRAM_ID = 'alertsOrEventsHistogramQuery';

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

export const eventsHistogramConfig: MatrixHistogramConfigs = {
  defaultStackByOption:
    eventsStackByOptions.find((o) => o.text === DEFAULT_STACK_BY) ?? eventsStackByOptions[0],
  errorMessage: i18n.ERROR_FETCHING_EVENTS_DATA,
  histogramType: MatrixHistogramType.events,
  stackByOptions: eventsStackByOptions,
  subtitle: undefined,
  title: i18n.NAVIGATION_EVENTS_TITLE,
  getLensAttributes: getEventsHistogramLensAttributes,
};

type QueryTabBodyProps = UserQueryTabBodyProps | HostQueryTabBodyProps | NetworkQueryTabBodyProps;

export type EventsQueryTabBodyComponentProps = QueryTabBodyProps & {
  deleteQuery?: GlobalTimeArgs['deleteQuery'];
  indexNames: string[];
  pageFilters?: Filter[];
  externalAlertPageFilters?: Filter[];
  setQuery: GlobalTimeArgs['setQuery'];
  timelineId: TimelineId;
};

const EventsQueryTabBodyComponent: React.FC<EventsQueryTabBodyComponentProps> = ({
  deleteQuery,
  endDate,
  filterQuery,
  indexNames,
  externalAlertPageFilters,
  pageFilters,
  setQuery,
  startDate,
  timelineId,
}) => {
  const dispatch = useDispatch();
  const { globalFullScreen } = useGlobalFullScreen();
  const ACTION_BUTTON_COUNT = 5;
  const tGridEnabled = useIsExperimentalFeatureEnabled('tGridEnabled');
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const [showExternalAlerts, setShowExternalAlerts] = useState(false);
  const leadingControlColumns = useMemo(() => getDefaultControlColumn(ACTION_BUTTON_COUNT), []);

  const toggleExternalAlerts = useCallback(() => setShowExternalAlerts((s) => !s), []);

  const getSubtitle = useCallback(
    (totalCount: number) =>
      `${SHOWING}: ${numeral(totalCount).format(defaultNumberFormat)} ${UNIT(totalCount)}`,
    [defaultNumberFormat]
  );

  const histogramExtraProps = useMemo(
    () => ({
      ...(showExternalAlerts
        ? {
            ...alertsHistogramConfig,
            subtitle: getSubtitle,
          }
        : {
            ...eventsHistogramConfig,
            unit,
          }),
    }),
    [getSubtitle, showExternalAlerts]
  );

  const statefulEventsViewerExtraProps = useMemo(
    () => ({
      ...(showExternalAlerts
        ? {
            pageFilters: [defaultAlertsFilters, ...(externalAlertPageFilters || [])],
          }
        : {
            pageFilters,
            unit,
          }),
    }),
    [showExternalAlerts, externalAlertPageFilters, pageFilters]
  );

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
        excludedRowRendererIds: showExternalAlerts
          ? alertsDefaultModel.excludedRowRendererIds
          : undefined,
      })
    );
  }, [dispatch, showExternalAlerts, tGridEnabled, timelineId]);

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ALERTS_EVENTS_HISTOGRAM_ID });
      }
    };
  }, [deleteQuery]);

  return (
    <>
      {!globalFullScreen && (
        <MatrixHistogram
          id={ALERTS_EVENTS_HISTOGRAM_ID}
          endDate={endDate}
          filterQuery={filterQuery}
          setQuery={setQuery}
          startDate={startDate}
          indexNames={indexNames}
          {...histogramExtraProps}
        />
      )}
      <StatefulEventsViewer
        additionalFilters={
          <EuiCheckbox
            id="showExternalAlertsCheckbox"
            aria-label="Show external alerts"
            onChange={toggleExternalAlerts}
            checked={showExternalAlerts}
            color="text"
            data-test-subj="showExternalAlertsCheckbox"
            label={i18n.SHOW_EXTERNAL_ALERTS}
          />
        }
        defaultCellActions={defaultCellActions}
        end={endDate}
        entityType={'events' as EntityType}
        leadingControlColumns={leadingControlColumns}
        renderCellValue={DefaultCellRenderer}
        rowRenderers={defaultRowRenderers}
        scopeId={SourcererScopeName.default}
        start={startDate}
        id={timelineId}
        defaultModel={{
          ...eventsDefaultModel,
          excludedRowRendererIds: showExternalAlerts ? Object.values(RowRendererId) : [],
        }}
        {...statefulEventsViewerExtraProps}
      />
    </>
  );
};

EventsQueryTabBodyComponent.displayName = 'EventsQueryTabBodyComponent';

export const EventsQueryTabBody = React.memo(EventsQueryTabBodyComponent);

EventsQueryTabBody.displayName = 'EventsQueryTabBody';
