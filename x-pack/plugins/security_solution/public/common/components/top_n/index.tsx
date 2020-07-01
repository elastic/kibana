/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { GlobalTime } from '../../containers/global_time';
import { BrowserFields, useWithSource } from '../../containers/source';
import { useKibana } from '../../lib/kibana';
import { esQuery, Filter, Query } from '../../../../../../../src/plugins/data/public';
import { inputsModel, inputsSelectors, State } from '../../store';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineModel } from '../../../timelines/store/timeline/model';
import { combineQueries } from '../../../timelines/components/timeline/helpers';

import { getOptions } from './helpers';
import { TopN } from './top_n';
import { useManageTimeline } from '../../../timelines/components/manage_timeline';
import { TimelineId } from '../../../../common/types/timeline';

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
  const mapStateToProps = (state: State) => {
    const activeTimeline: TimelineModel = getTimeline(state, TimelineId.active) ?? timelineDefaults;
    const activeTimelineFilters = activeTimeline.filters ?? EMPTY_FILTERS;
    const activeTimelineInput: inputsModel.InputsRange = getInputsTimeline(state);

    return {
      activeTimelineEventType: activeTimeline.eventType,
      activeTimelineFilters,
      activeTimelineFrom: activeTimelineInput.timerange.from,
      activeTimelineKqlQueryExpression: getKqlQueryTimeline(state, TimelineId.active),
      activeTimelineTo: activeTimelineInput.timerange.to,
      dataProviders: activeTimeline.dataProviders,
      globalQuery: getGlobalQuerySelector(state),
      globalFilters: getGlobalFiltersQuerySelector(state),
      kqlMode: activeTimeline.kqlMode,
    };
  };

  return mapStateToProps;
};

const mapDispatchToProps = { setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker };

const connector = connect(makeMapStateToProps, mapDispatchToProps);

interface OwnProps {
  browserFields: BrowserFields;
  field: string;
  timelineId: string | null;
  toggleTopN: () => void;
  onFilterAdded?: () => void;
  value?: string[] | string | null;
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
  globalFilters = EMPTY_FILTERS,
  globalQuery = EMPTY_QUERY,
  kqlMode,
  onFilterAdded,
  setAbsoluteRangeDatePicker,
  timelineId,
  toggleTopN,
  value,
}) => {
  const kibana = useKibana();

  //  Regarding data from useManageTimeline:
  //  * `indexToAdd`, which enables the alerts index to be appended to
  //    the `indexPattern` returned by `useWithSource`, may only be populated when
  //    this component is rendered in the context of the active timeline. This
  //    behavior enables the 'All events' view by appending the alerts index
  //    to the index pattern.
  const { getManageTimelineById } = useManageTimeline();
  const { indexToAdd } = useMemo(
    () =>
      timelineId === TimelineId.active
        ? getManageTimelineById(TimelineId.active)
        : { indexToAdd: null },
    [getManageTimelineById, timelineId]
  );

  const options = getOptions(
    timelineId === TimelineId.active ? activeTimelineEventType : undefined
  );

  const { indexPattern } = useWithSource('default', indexToAdd);

  return (
    <GlobalTime>
      {({ from, deleteQuery, setQuery, to }) => (
        <TopN
          combinedQueries={
            timelineId === TimelineId.active
              ? combineQueries({
                  browserFields,
                  config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
                  dataProviders,
                  end: activeTimelineTo,
                  filters: activeTimelineFilters,
                  indexPattern,
                  kqlMode,
                  kqlQuery: {
                    language: 'kuery',
                    query: activeTimelineKqlQueryExpression ?? '',
                  },
                  start: activeTimelineFrom,
                })?.filterQuery
              : undefined
          }
          data-test-subj="top-n"
          defaultView={
            timelineId === TimelineId.alertsPage || timelineId === TimelineId.alertsRulesDetailsPage
              ? 'alert'
              : options[0].value
          }
          deleteQuery={timelineId === TimelineId.active ? undefined : deleteQuery}
          field={field}
          filters={timelineId === TimelineId.active ? EMPTY_FILTERS : globalFilters}
          from={timelineId === TimelineId.active ? activeTimelineFrom : from}
          indexPattern={indexPattern}
          indexToAdd={indexToAdd}
          options={options}
          query={timelineId === TimelineId.active ? EMPTY_QUERY : globalQuery}
          setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
          setAbsoluteRangeDatePickerTarget={
            timelineId === TimelineId.active ? 'timeline' : 'global'
          }
          setQuery={setQuery}
          to={timelineId === TimelineId.active ? activeTimelineTo : to}
          toggleTopN={toggleTopN}
          onFilterAdded={onFilterAdded}
          value={value}
        />
      )}
    </GlobalTime>
  );
};

StatefulTopNComponent.displayName = 'StatefulTopNComponent';

export const StatefulTopN = connector(React.memo(StatefulTopNComponent));
