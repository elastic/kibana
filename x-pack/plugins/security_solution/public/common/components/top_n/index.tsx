/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import type { DataViewBase, Filter, Query } from '@kbn/es-query';
import { useGlobalTime } from '../../containers/use_global_time';
import { BrowserFields } from '../../containers/source';
import { useKibana } from '../../lib/kibana';
import { getEsQueryConfig } from '../../../../../../../src/plugins/data/common';
import { inputsModel, inputsSelectors, State } from '../../store';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineModel } from '../../../timelines/store/timeline/model';
import { combineQueries } from '../../../timelines/components/timeline/helpers';

import { getOptions } from './helpers';
import { TopN } from './top_n';
import { TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import { AlertsStackByField } from '../../../detections/components/alerts_kpis/common/types';

const EMPTY_FILTERS: Filter[] = [];
const EMPTY_QUERY: Query = { query: '', language: 'kuery' };

const makeMapStateToProps = () => {
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const getKqlQueryTimeline = timelineSelectors.getKqlFilterQuerySelector();

  // The mapped Redux state provided to this component includes the global
  // filters that appear at the top of most views in the app, and all the
  // filters in the active timeline:
  const mapStateToProps = (state: State, ownProps: { globalFilters?: Filter[] }) => {
    const activeTimeline: TimelineModel = getTimeline(state, TimelineId.active) ?? timelineDefaults;
    const activeTimelineFilters = activeTimeline.filters ?? EMPTY_FILTERS;
    const activeTimelineInput: inputsModel.InputsRange = getInputsTimeline(state);
    const { globalFilters } = ownProps;
    return {
      activeTimelineEventType: activeTimeline.eventType,
      activeTimelineFilters:
        activeTimeline.activeTab === TimelineTabs.query ? activeTimelineFilters : EMPTY_FILTERS,
      activeTimelineFrom: activeTimelineInput.timerange.from,
      activeTimelineKqlQueryExpression:
        activeTimeline.activeTab === TimelineTabs.query
          ? getKqlQueryTimeline(state, TimelineId.active)
          : null,
      activeTimelineTo: activeTimelineInput.timerange.to,
      dataProviders:
        activeTimeline.activeTab === TimelineTabs.query ? activeTimeline.dataProviders : [],
      globalQuery: getGlobalQuerySelector(state),
      globalFilters: globalFilters ?? getGlobalFiltersQuerySelector(state),
      kqlMode: activeTimeline.kqlMode,
    };
  };

  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

//  * `indexToAdd`, which enables the alerts index to be appended to
//    the `indexPattern` returned by `useWithSource`, may only be populated when
//    this component is rendered in the context of the active timeline. This
//    behavior enables the 'All events' view by appending the alerts index
//    to the index pattern.
export interface OwnProps {
  browserFields: BrowserFields;
  field: string;
  indexPattern: DataViewBase;
  timelineId?: string;
  toggleTopN: () => void;
  onFilterAdded?: () => void;
  paddingSize?: 's' | 'm' | 'l' | 'none';
  showLegend?: boolean;
  value?: string[] | string | null;
  globalFilters?: Filter[];
}
type PropsFromRedux = ConnectedProps<typeof connector>;
type Props = OwnProps & PropsFromRedux;

const StatefulTopNComponent: React.FC<Props> = ({
  activeTimelineEventType,
  activeTimelineFilters,
  activeTimelineFrom,
  activeTimelineKqlQueryExpression,
  activeTimelineTo,
  browserFields,
  dataProviders,
  field,
  indexPattern,
  globalFilters = EMPTY_FILTERS,
  globalQuery = EMPTY_QUERY,
  kqlMode,
  onFilterAdded,
  paddingSize,
  showLegend,
  timelineId,
  toggleTopN,
  value,
}) => {
  const { uiSettings } = useKibana().services;
  const { from, deleteQuery, setQuery, to } = useGlobalTime(false);

  const options = getOptions(
    timelineId === TimelineId.active ? activeTimelineEventType : undefined
  );

  const combinedQueries = useMemo(
    () =>
      timelineId === TimelineId.active
        ? combineQueries({
            browserFields,
            config: getEsQueryConfig(uiSettings),
            dataProviders,
            filters: activeTimelineFilters,
            indexPattern,
            kqlMode,
            kqlQuery: {
              language: 'kuery',
              query: activeTimelineKqlQueryExpression ?? '',
            },
          })?.filterQuery
        : undefined,
    [
      activeTimelineFilters,
      activeTimelineKqlQueryExpression,
      browserFields,
      dataProviders,
      indexPattern,
      kqlMode,
      timelineId,
      uiSettings,
    ]
  );

  const defaultView = useMemo(
    () =>
      timelineId === TimelineId.detectionsPage ||
      timelineId === TimelineId.detectionsRulesDetailsPage
        ? 'alert'
        : options[0].value,
    [options, timelineId]
  );

  return (
    <TopN
      combinedQueries={combinedQueries}
      data-test-subj="top-n"
      defaultView={defaultView}
      deleteQuery={timelineId === TimelineId.active ? undefined : deleteQuery}
      field={field as AlertsStackByField}
      filters={timelineId === TimelineId.active ? EMPTY_FILTERS : globalFilters}
      from={timelineId === TimelineId.active ? activeTimelineFrom : from}
      indexPattern={indexPattern}
      options={options}
      paddingSize={paddingSize}
      query={timelineId === TimelineId.active ? EMPTY_QUERY : globalQuery}
      showLegend={showLegend}
      setAbsoluteRangeDatePickerTarget={timelineId === TimelineId.active ? 'timeline' : 'global'}
      setQuery={setQuery}
      timelineId={timelineId}
      to={timelineId === TimelineId.active ? activeTimelineTo : to}
      toggleTopN={toggleTopN}
      onFilterAdded={onFilterAdded}
      value={value}
    />
  );
};

StatefulTopNComponent.displayName = 'StatefulTopNComponent';

export const StatefulTopN: React.FunctionComponent<OwnProps> = connector(
  React.memo(StatefulTopNComponent)
);
