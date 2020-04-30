/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { GlobalTime } from '../../containers/global_time';
import { BrowserFields, WithSource } from '../../containers/source';
import { useKibana } from '../../lib/kibana';
import { esQuery, Filter, Query } from '../../../../../../src/plugins/data/public';
import { inputsModel, inputsSelectors, State, timelineSelectors } from '../../store';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { timelineDefaults } from '../../store/timeline/defaults';
import { TimelineModel } from '../../store/timeline/model';
import { combineQueries } from '../timeline/helpers';
import { useTimelineTypeContext } from '../timeline/timeline_context';

import { getOptions } from './helpers';
import { TopN } from './top_n';

/** The currently active timeline always has this Redux ID */
export const ACTIVE_TIMELINE_REDUX_ID = 'timeline-1';

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
    const activeTimeline: TimelineModel =
      getTimeline(state, ACTIVE_TIMELINE_REDUX_ID) ?? timelineDefaults;
    const activeTimelineFilters = activeTimeline.filters ?? EMPTY_FILTERS;
    const activeTimelineInput: inputsModel.InputsRange = getInputsTimeline(state);

    return {
      activeTimelineEventType: activeTimeline.eventType,
      activeTimelineFilters,
      activeTimelineFrom: activeTimelineInput.timerange.from,
      activeTimelineKqlQueryExpression: getKqlQueryTimeline(state, ACTIVE_TIMELINE_REDUX_ID),
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
  toggleTopN,
  value,
}) => {
  const kibana = useKibana();

  //  Regarding data from useTimelineTypeContext:
  //  * `documentType` (e.g. 'signals') may only be populated in some views,
  //    e.g. the `Signals` view on the `Detections` page.
  //  * `id` (`timelineId`) may only be populated when we are rendered in the
  //    context of the active timeline.
  //  * `indexToAdd`, which enables the signals index to be appended to
  //    the `indexPattern` returned by `WithSource`, may only be populated when
  //    this component is rendered in the context of the active timeline. This
  //    behavior enables the 'All events' view by appending the signals index
  //    to the index pattern.
  const { documentType, id: timelineId, indexToAdd } = useTimelineTypeContext();

  const options = getOptions(
    timelineId === ACTIVE_TIMELINE_REDUX_ID ? activeTimelineEventType : undefined
  );

  return (
    <GlobalTime>
      {({ from, deleteQuery, setQuery, to }) => (
        <WithSource sourceId="default" indexToAdd={indexToAdd}>
          {({ indexPattern }) => (
            <TopN
              combinedQueries={
                timelineId === ACTIVE_TIMELINE_REDUX_ID
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
                documentType?.toLocaleLowerCase() === 'signals' ? 'signal' : options[0].value
              }
              deleteQuery={timelineId === ACTIVE_TIMELINE_REDUX_ID ? undefined : deleteQuery}
              field={field}
              filters={timelineId === ACTIVE_TIMELINE_REDUX_ID ? EMPTY_FILTERS : globalFilters}
              from={timelineId === ACTIVE_TIMELINE_REDUX_ID ? activeTimelineFrom : from}
              indexPattern={indexPattern}
              indexToAdd={indexToAdd}
              options={options}
              query={timelineId === ACTIVE_TIMELINE_REDUX_ID ? EMPTY_QUERY : globalQuery}
              setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
              setAbsoluteRangeDatePickerTarget={
                timelineId === ACTIVE_TIMELINE_REDUX_ID ? 'timeline' : 'global'
              }
              setQuery={setQuery}
              to={timelineId === ACTIVE_TIMELINE_REDUX_ID ? activeTimelineTo : to}
              toggleTopN={toggleTopN}
              onFilterAdded={onFilterAdded}
              value={value}
            />
          )}
        </WithSource>
      )}
    </GlobalTime>
  );
};

StatefulTopNComponent.displayName = 'StatefulTopNComponent';

export const StatefulTopN = connector(React.memo(StatefulTopNComponent));
