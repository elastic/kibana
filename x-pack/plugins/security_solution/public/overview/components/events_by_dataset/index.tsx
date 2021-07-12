/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Position } from '@elastic/charts';
import numeral from '@elastic/numeral';
import React, { useEffect, useMemo, useCallback } from 'react';
import uuid from 'uuid';

import { DEFAULT_NUMBER_FORMAT, APP_ID } from '../../../../common/constants';
import { SHOWING, UNIT } from '../../../common/components/events_viewer/translations';
import { getTabsOnHostsUrl } from '../../../common/components/link_to/redirect_to_hosts';
import { MatrixHistogram } from '../../../common/components/matrix_histogram';
import {
  MatrixHistogramConfigs,
  MatrixHistogramOption,
} from '../../../common/components/matrix_histogram/types';
import { eventsStackByOptions } from '../../../hosts/pages/navigation';
import { convertToBuildEsQuery } from '../../../common/lib/keury';
import { useKibana, useUiSetting$ } from '../../../common/lib/kibana';
import { histogramConfigs } from '../../../hosts/pages/navigation/events_query_tab_body';
import {
  Filter,
  esQuery,
  IIndexPattern,
  Query,
} from '../../../../../../../src/plugins/data/public';
import { HostsTableType } from '../../../hosts/store/model';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';

import * as i18n from '../../pages/translations';
import { SecurityPageName } from '../../../app/types';
import { useFormatUrl } from '../../../common/components/link_to';
import { LinkButton } from '../../../common/components/links';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';

const DEFAULT_STACK_BY = 'event.dataset';

const ID = 'eventsByDatasetOverview';

interface Props extends Pick<GlobalTimeArgs, 'from' | 'to' | 'deleteQuery' | 'setQuery'> {
  combinedQueries?: string;
  filters: Filter[];
  headerChildren?: React.ReactNode;
  indexPattern: IIndexPattern;
  indexNames: string[];
  onlyField?: string;
  query: Query;
  setAbsoluteRangeDatePickerTarget?: InputsModelId;
  showSpacer?: boolean;
  timelineId?: string;
  toggleTopN?: () => void;
}

const getHistogramOption = (fieldName: string): MatrixHistogramOption => ({
  text: fieldName,
  value: fieldName,
});

const EventsByDatasetComponent: React.FC<Props> = ({
  combinedQueries,
  deleteQuery,
  filters,
  from,
  headerChildren,
  indexPattern,
  indexNames,
  onlyField,
  query,
  setAbsoluteRangeDatePickerTarget,
  setQuery,
  showSpacer = true,
  timelineId,
  to,
  toggleTopN,
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
  const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.hosts);
  const { navigateToApp } = kibana.services.application;
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const goToHostEvents = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(APP_ID, {
        deepLinkId: SecurityPageName.hosts,
        path: getTabsOnHostsUrl(HostsTableType.events, urlSearch),
      });
    },
    [navigateToApp, urlSearch]
  );

  const eventsCountViewEventsButton = useMemo(
    () => (
      <LinkButton
        onClick={goToHostEvents}
        href={formatUrl(getTabsOnHostsUrl(HostsTableType.events))}
      >
        {i18n.VIEW_EVENTS}
      </LinkButton>
    ),
    [goToHostEvents, formatUrl]
  );

  const [filterQuery, kqlError] = useMemo(() => {
    if (combinedQueries == null) {
      return convertToBuildEsQuery({
        config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
        indexPattern,
        queries: [query],
        filters,
      });
    }
    return [combinedQueries];
  }, [combinedQueries, kibana, indexPattern, query, filters]);

  useInvalidFilterQuery({
    id: uniqueQueryId,
    filterQuery,
    kqlError,
    query,
    startDate: from,
    endDate: to,
  });

  const eventsByDatasetHistogramConfigs: MatrixHistogramConfigs = useMemo(
    () => ({
      ...histogramConfigs,
      stackByOptions:
        onlyField != null ? [getHistogramOption(onlyField)] : histogramConfigs.stackByOptions,
      defaultStackByOption:
        onlyField != null
          ? getHistogramOption(onlyField)
          : eventsStackByOptions.find((o) => o.text === DEFAULT_STACK_BY) ??
            eventsStackByOptions[0],
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
    <MatrixHistogram
      endDate={to}
      filterQuery={filterQuery}
      headerChildren={headerContent}
      id={uniqueQueryId}
      indexNames={indexNames}
      onError={toggleTopN}
      setAbsoluteRangeDatePickerTarget={setAbsoluteRangeDatePickerTarget}
      setQuery={setQuery}
      showSpacer={showSpacer}
      skip={filterQuery === undefined}
      startDate={from}
      timelineId={timelineId}
      {...eventsByDatasetHistogramConfigs}
      title={onlyField != null ? i18n.TOP(onlyField) : eventsByDatasetHistogramConfigs.title}
    />
  );
};

EventsByDatasetComponent.displayName = 'EventsByDatasetComponent';

export const EventsByDataset = React.memo(EventsByDatasetComponent);
