/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Position } from '@elastic/charts';
import { EuiButton } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useEffect, useMemo } from 'react';
import uuid from 'uuid';

import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import { SHOWING, UNIT } from '../../../components/events_viewer/translations';
import { getTabsOnHostsUrl } from '../../../components/link_to/redirect_to_hosts';
import { MatrixHistogramContainer } from '../../../components/matrix_histogram';
import {
  MatrixHisrogramConfigs,
  MatrixHistogramOption,
} from '../../../components/matrix_histogram/types';
import { useGetUrlSearch } from '../../../components/navigation/use_get_url_search';
import { navTabs } from '../../home/home_navigations';
import { eventsStackByOptions } from '../../hosts/navigation';
import { convertToBuildEsQuery } from '../../../lib/keury';
import { useKibana, useUiSetting$ } from '../../../lib/kibana';
import { histogramConfigs } from '../../../pages/hosts/navigation/events_query_tab_body';
import {
  Filter,
  esQuery,
  IIndexPattern,
  Query,
} from '../../../../../../../src/plugins/data/public';
import { inputsModel } from '../../../store';
import { HostsTableType, HostsType } from '../../../store/hosts/model';
import { InputsModelId } from '../../../store/inputs/constants';

import * as i18n from '../translations';

const NO_FILTERS: Filter[] = [];
const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };
const DEFAULT_STACK_BY = 'event.dataset';

const ID = 'eventsByDatasetOverview';

interface Props {
  combinedQueries?: string;
  deleteQuery?: ({ id }: { id: string }) => void;
  filters?: Filter[];
  from: number;
  headerChildren?: React.ReactNode;
  indexPattern: IIndexPattern;
  indexToAdd?: string[] | null;
  onlyField?: string;
  query?: Query;
  setAbsoluteRangeDatePickerTarget?: InputsModelId;
  setQuery: (params: {
    id: string;
    inspect: inputsModel.InspectQuery | null;
    loading: boolean;
    refetch: inputsModel.Refetch;
  }) => void;
  showSpacer?: boolean;
  to: number;
}

const getHistogramOption = (fieldName: string): MatrixHistogramOption => ({
  text: fieldName,
  value: fieldName,
});

const EventsByDatasetComponent: React.FC<Props> = ({
  combinedQueries,
  deleteQuery,
  filters = NO_FILTERS,
  from,
  headerChildren,
  indexPattern,
  indexToAdd,
  onlyField,
  query = DEFAULT_QUERY,
  setAbsoluteRangeDatePickerTarget,
  setQuery,
  showSpacer = true,
  to,
}) => {
  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `${ID}-${uuid.v4()}`, []);

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: uniqueQueryId });
      }
    };
  }, [deleteQuery, uniqueQueryId]);

  const kibana = useKibana();
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const urlSearch = useGetUrlSearch(navTabs.hosts);

  const eventsCountViewEventsButton = useMemo(
    () => (
      <EuiButton href={getTabsOnHostsUrl(HostsTableType.events, urlSearch)}>
        {i18n.VIEW_EVENTS}
      </EuiButton>
    ),
    [urlSearch]
  );

  const filterQuery = useMemo(
    () =>
      combinedQueries == null
        ? convertToBuildEsQuery({
            config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
            indexPattern,
            queries: [query],
            filters,
          })
        : combinedQueries,
    [combinedQueries, kibana, indexPattern, query, filters]
  );

  const eventsByDatasetHistogramConfigs: MatrixHisrogramConfigs = useMemo(
    () => ({
      ...histogramConfigs,
      stackByOptions:
        onlyField != null ? [getHistogramOption(onlyField)] : histogramConfigs.stackByOptions,
      defaultStackByOption:
        onlyField != null
          ? getHistogramOption(onlyField)
          : eventsStackByOptions.find(o => o.text === DEFAULT_STACK_BY) ?? eventsStackByOptions[0],
      legendPosition: Position.Right,
      subtitle: (totalCount: number) =>
        `${SHOWING}: ${numeral(totalCount).format(defaultNumberFormat)} ${UNIT(totalCount)}`,
      titleSize: onlyField == null ? 'm' : 's',
    }),
    [onlyField, defaultNumberFormat]
  );

  const headerContent = useMemo(() => {
    if (onlyField == null || headerChildren != null) {
      return (
        <>
          {headerChildren}
          {onlyField == null && eventsCountViewEventsButton}
        </>
      );
    } else {
      return null;
    }
  }, [onlyField, headerChildren, eventsCountViewEventsButton]);

  return (
    <MatrixHistogramContainer
      endDate={to}
      filterQuery={filterQuery}
      headerChildren={headerContent}
      id={uniqueQueryId}
      indexToAdd={indexToAdd}
      setAbsoluteRangeDatePickerTarget={setAbsoluteRangeDatePickerTarget}
      setQuery={setQuery}
      showSpacer={showSpacer}
      sourceId="default"
      startDate={from}
      type={HostsType.page}
      {...eventsByDatasetHistogramConfigs}
      title={onlyField != null ? i18n.TOP(onlyField) : eventsByDatasetHistogramConfigs.title}
    />
  );
};

EventsByDatasetComponent.displayName = 'EventsByDatasetComponent';

export const EventsByDataset = React.memo(EventsByDatasetComponent);
