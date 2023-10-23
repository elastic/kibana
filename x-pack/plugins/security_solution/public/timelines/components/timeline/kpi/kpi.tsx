/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { isEmpty, pick, get } from 'lodash';
import { useSelector } from 'react-redux';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { TimerangeInput } from '@kbn/timelines-plugin/common';
import { TimelineId } from '../../../../../common/types';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import type { State } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { ToggleContainer } from '../../../../common/components/toggle_container';
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
    isEmpty(dataProviders) && isEmpty(kqlQueryTimeline) && timelineType === 'template'
      ? ' '
      : kqlQueryTimeline;
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

  const title = useMemo(() => {
    return <TimelineKPIs2 kpis={kpis} isLoading={loading} />;
  }, [kpis, loading]);

  return <ToggleContainer title={title} />;
};
