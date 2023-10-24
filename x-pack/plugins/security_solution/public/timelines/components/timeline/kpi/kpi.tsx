/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { isEmpty, get, pick } from 'lodash/fp';
import { useSelector } from 'react-redux';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { TimerangeInput } from '@kbn/timelines-plugin/common';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup, EuiPanel } from '@elastic/eui';
import { useLocalStorage } from 'react-use';
import type { TimeRange, Filter } from '@kbn/es-query';
import { getAlertsHistogramLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/common/alerts/alerts_histogram';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';
import { FieldSelection } from '../../../../common/components/field_selection';
import { useEuiComboBoxReset } from '../../../../common/components/use_combo_box_reset';
import { ToggleContainer } from '../../../../common/components/toggle_container';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { TimelineId } from '../../../../../common/types';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import type { State } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { TimelineKPIs2 } from '../../flyout/header/kpis_new';
import { useTimelineKpis } from '../../../containers/kpis';
import { useKibana } from '../../../../common/lib/kibana';
import { timelineSelectors } from '../../../store/timeline';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { combineQueries } from '../../../../common/lib/kuery';
import {
  endSelector,
  startSelector,
} from '../../../../common/components/super_date_picker/selectors';

interface KpiExpandedProps {
  timelineId: string;
}

const StyledEuiPanel = euiStyled(EuiPanel)`
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  max-height: 308px;
`;

export const TimelineKpi = ({ timelineId }: KpiExpandedProps) => {
  const { browserFields, indexPattern, selectedPatterns } = useSourcererDataView(
    SourcererScopeName.timeline
  );

  const { uiSettings } = useKibana().services;
  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const {
    activeTab,
    dataProviders,
    kqlQuery,
    title: timelineTitle,
    timelineType,
    status: timelineStatus,
    updated,
    show,
    filters,
    kqlMode,
  } = useDeepEqualSelector((state) =>
    pick(
      [
        'activeTab',
        'dataProviders',
        'kqlQuery',
        'status',
        'title',
        'timelineType',
        'updated',
        'show',
        'filters',
        'kqlMode',
      ],
      getTimeline(state, timelineId) ?? timelineDefaults
    )
  );
  const isDataInTimeline = useMemo(
    () => !isEmpty(dataProviders) || !isEmpty(get('filterQuery.kuery.expression', kqlQuery)),
    [dataProviders, kqlQuery]
  );

  const getKqlQueryTimeline = useMemo(() => timelineSelectors.getKqlFilterQuerySelector(), []);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const kqlQueryTimeline = useSelector((state: State) => getKqlQueryTimeline(state, timelineId)!);

  const kqlQueryExpression =
    isEmpty(dataProviders) && isEmpty(kqlQueryTimeline) ? ' ' : kqlQueryTimeline;

  console.log('@@', { kqlQueryTimeline, kqlQueryExpression });

  const kqlQueryTest = useMemo(
    () => ({ query: kqlQueryExpression, language: 'kuery' }),
    [kqlQueryExpression]
  );

  const isActive = useMemo(() => timelineId === TimelineId.active, [timelineId]);
  const getStartSelector = useMemo(() => startSelector(), []);
  const getEndSelector = useMemo(() => endSelector(), []);

  const timerange: TimerangeInput = useDeepEqualSelector((state) => {
    if (isActive) {
      return {
        from: getStartSelector(state.inputs.timeline),
        to: getEndSelector(state.inputs.timeline),
        interval: '',
      };
    } else {
      return {
        from: getStartSelector(state.inputs.global),
        to: getEndSelector(state.inputs.global),
        interval: '',
      };
    }
  });

  const combinedQueries = useMemo(
    () =>
      combineQueries({
        config: esQueryConfig,
        dataProviders,
        indexPattern,
        browserFields,
        filters: filters ? filters : [],
        kqlQuery: kqlQueryTest,
        kqlMode,
      }),
    [browserFields, dataProviders, esQueryConfig, filters, indexPattern, kqlMode, kqlQueryTest]
  );

  console.log('@@', {
    dataProviders,
    esQueryConfig,
    indexPattern,
    browserFields,
    filters,
    kqlQueryTest,
    kqlMode,
  });

  const isBlankTimeline: boolean = useMemo(
    () =>
      (isEmpty(dataProviders) && isEmpty(filters) && isEmpty(kqlQueryTest.query)) ||
      combinedQueries?.filterQuery === undefined,
    [dataProviders, filters, kqlQueryTest, combinedQueries]
  );

  const [loading, kpis] = useTimelineKpis({
    defaultIndex: selectedPatterns,
    timerange,
    isBlankTimeline,
    filterQuery: combinedQueries?.filterQuery ?? '',
  });
  const queryId = `TIMELINE_STATS`;
  const { toggleStatus, setToggleStatus } = useQueryToggle(queryId);
  const timelineStatsTypeOptions: string[] = ['trend', 'table', 'treemap'];

  const [statGroupSelection, setStatGroupSelection] =
    useState<typeof timelineStatsTypeOptions[number]>('trend');

  const statGroupOptions = timelineStatsTypeOptions.map((item) => getOptionProperties(item));

  const title = useMemo(() => {
    if (toggleStatus) {
      return (
        <EuiButtonGroup
          name="chart-select"
          legend={'Select a Tab'}
          options={statGroupOptions}
          idSelected={statGroupSelection}
          onChange={(id) => setStatGroupSelection(id)}
          buttonSize="compressed"
          color="primary"
          data-test-subj="chart-select-tabs"
        />
      );
    }
    return <TimelineKPIs2 kpis={kpis} isLoading={loading} />;
  }, [kpis, loading, statGroupOptions, statGroupSelection, toggleStatus]);

  const {
    comboboxRef: stackByField0ComboboxRef,
    onReset: onResetStackByField0,
    setComboboxInputRef: setStackByField0ComboboxRef,
  } = useEuiComboBoxReset();

  const {
    comboboxRef: stackByField1ComboboxRef,
    onReset: onResetStackByField1,
    setComboboxInputRef: setStackByField1ComboboxRef,
  } = useEuiComboBoxReset();

  const [stackByField0, setStackByField0] = useLocalStorage(
    'timeline-stats-stack-by-0',
    'user.name'
  );

  const [stackByField1, setStackByField1] = useLocalStorage(
    'timeline-stats-stack-by-1',
    'host.name'
  );

  const Append = useMemo(() => {
    if (toggleStatus)
      return (
        <FieldSelection
          chartOptionsContextMenu={undefined}
          stackByField0={stackByField0 ?? ''}
          stackByField0ComboboxRef={stackByField0ComboboxRef}
          setStackByField0={setStackByField0}
          setStackByField0ComboboxInputRef={setStackByField0ComboboxRef}
          setStackByField1={setStackByField1}
          setStackByField1ComboboxInputRef={setStackByField1ComboboxRef}
          stackByField1={stackByField1}
          stackByField1ComboboxRef={stackByField1ComboboxRef}
          uniqueQueryId={queryId}
        />
      );
  }, [
    toggleStatus,
    queryId,
    stackByField0,
    stackByField1,
    setStackByField1,
    setStackByField0,
    stackByField0ComboboxRef,
    stackByField1ComboboxRef,
    setStackByField0ComboboxRef,
    setStackByField1ComboboxRef,
  ]);

  // return (
  //   <StyledEuiPanel hasBorder data-test-subj="alertCountByRulePanel">
  //     <>
  //       <HeaderSection
  //         id={queryId}
  //         titleSize="m"
  //         title={title}
  //         toggleStatus={toggleStatus}
  //         toggleQuery={setToggleStatus}
  //       />
  //     </>
  //   </StyledEuiPanel>
  // );
  return (
    <ToggleContainer
      title={title}
      toggleStatus={toggleStatus}
      onToggle={setToggleStatus}
      append={Append}
    >
      {statGroupSelection === 'trend' ? (
        <TimelineStatsTrend
          stackByField={stackByField1 ?? 'user.name'}
          timerange={timerange}
          filters={filters}
        />
      ) : null}
    </ToggleContainer>
  );
};

function getOptionProperties(optionId: string): EuiButtonGroupOptionProps {
  const timelineStatsOption = {
    id: optionId,
    'data-test-subj': `timeline-stat-group-select-${optionId}`,
    label: optionId,
    value: optionId,
  };

  return timelineStatsOption;
}

interface TimelineStatsProps {
  stackByField: string;
  timerange: Pick<TimeRange, 'from' | 'to'>;
  filters: Filter[];
}

const TimelineStatsTrend = (props: TimelineStatsProps) => {
  const { stackByField, timerange, filters } = props;

  return (
    <VisualizationEmbeddable
      inputId={InputsModelId.timeline}
      id="someId"
      height={255}
      stackByField={stackByField}
      timerange={timerange}
      getLensAttributes={getAlertsHistogramLensAttributes}
      scopeId={SourcererScopeName.timeline}
      extraOptions={{ filters }}
    />
  );
};
