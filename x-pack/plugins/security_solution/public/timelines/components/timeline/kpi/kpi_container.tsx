/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { TimerangeInput } from '@kbn/timelines-plugin/common';
import { isEmpty, pick } from 'lodash/fp';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TimelineId } from '../../../../../common/types';
import {
  endSelector,
  startSelector,
} from '../../../../common/components/super_date_picker/selectors';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useKibana } from '../../../../common/lib/kibana';
import { combineQueries } from '../../../../common/lib/kuery';
import type { State } from '../../../../common/store';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useTimelineKpis } from '../../../containers/kpis';
import { timelineSelectors } from '../../../store';
import { timelineDefaults } from '../../../store/defaults';
import { TimelineKPIs } from './kpis';

interface KpiExpandedProps {
  timelineId: string;
}

export const TimelineKpisContainer = ({ timelineId }: KpiExpandedProps) => {
  const { browserFields, indexPattern, selectedPatterns } = useSourcererDataView(
    SourcererScopeName.timeline
  );

  const { uiSettings } = useKibana().services;
  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { dataProviders, filters, kqlMode } = useDeepEqualSelector((state) =>
    pick(
      ['dataProviders', 'filters', 'kqlMode'],
      getTimeline(state, timelineId) ?? timelineDefaults
    )
  );

  const getKqlQueryTimeline = useMemo(() => timelineSelectors.getKqlFilterQuerySelector(), []);

  const kqlQueryTimeline = useSelector((state: State) => getKqlQueryTimeline(state, timelineId));

  const kqlQueryExpression = kqlQueryTimeline ?? ' ';

  const kqlQuery = useMemo(
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
        kqlQuery,
        kqlMode,
      }),
    [browserFields, dataProviders, esQueryConfig, filters, indexPattern, kqlMode, kqlQuery]
  );

  const isBlankTimeline: boolean = useMemo(
    () =>
      (isEmpty(dataProviders) && isEmpty(filters) && isEmpty(kqlQuery.query)) ||
      combinedQueries?.filterQuery === undefined,
    [dataProviders, filters, kqlQuery, combinedQueries]
  );

  const [, kpis] = useTimelineKpis({
    defaultIndex: selectedPatterns,
    timerange,
    isBlankTimeline,
    filterQuery: combinedQueries?.filterQuery ?? '',
  });

  return (
    <EuiPanel paddingSize="m" hasBorder>
      <TimelineKPIs kpis={kpis} />
    </EuiPanel>
  );
};
