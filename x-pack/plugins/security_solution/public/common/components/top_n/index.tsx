/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { useGlobalTime } from '../../containers/use_global_time';
import { BrowserFields } from '../../containers/source';
import { useKibana } from '../../lib/kibana';
import {
  esQuery,
  Filter,
  Query,
  IIndexPattern,
} from '../../../../../../../src/plugins/data/public';
import { inputsModel, inputsSelectors, State } from '../../store';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineModel } from '../../../timelines/store/timeline/model';
import { combineQueries } from '../../../timelines/components/timeline/helpers';

import { getOptions } from './helpers';
import { TopN } from './top_n';
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

//  * `indexToAdd`, which enables the alerts index to be appended to
//    the `indexPattern` returned by `useWithSource`, may only be populated when
//    this component is rendered in the context of the active timeline. This
//    behavior enables the 'All events' view by appending the alerts index
//    to the index pattern.
interface OwnProps {
  browserFields: BrowserFields;
  field: string;
  indexPattern: IIndexPattern;
  indexToAdd: string[] | null;
  timelineId?: string;
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
  indexPattern,
  indexToAdd,
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
  const { from, deleteQuery, setQuery, to } = useGlobalTime();

  const options = getOptions(
    timelineId === TimelineId.active ? activeTimelineEventType : undefined
  );

  return (
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
        timelineId === TimelineId.detectionsPage ||
        timelineId === TimelineId.detectionsRulesDetailsPage
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

export const StatefulTopN = connector(React.memo(StatefulTopNComponent));
