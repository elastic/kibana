/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useEffect, useMemo } from 'react';
import { Position } from '@elastic/charts';

import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import { SHOWING, UNIT } from '../../../common/components/alerts_viewer/translations';
import { MatrixHistogramContainer } from '../../../common/components/matrix_histogram';
import { useKibana, useUiSetting$ } from '../../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../../common/lib/keury';
import {
  Filter,
  esQuery,
  IIndexPattern,
  Query,
} from '../../../../../../../src/plugins/data/public';
import { inputsModel } from '../../../common/store';
import { HostsTableType, HostsType } from '../../../hosts/store/model';

import * as i18n from '../../pages/translations';
import {
  alertsStackByOptions,
  histogramConfigs,
} from '../../../common/components/alerts_viewer/histogram_configs';
import { MatrixHisrogramConfigs } from '../../../common/components/matrix_histogram/types';
import { useGetUrlSearch } from '../../../common/components/navigation/use_get_url_search';
import { navTabs } from '../../../app/home/home_navigations';
import { getTabsOnHostsUrl } from '../../../common/components/link_to/redirect_to_hosts';

const ID = 'alertsByCategoryOverview';

const NO_FILTERS: Filter[] = [];
const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };
const DEFAULT_STACK_BY = 'event.module';

interface Props {
  deleteQuery?: ({ id }: { id: string }) => void;
  filters?: Filter[];
  from: number;
  hideHeaderChildren?: boolean;
  indexPattern: IIndexPattern;
  query?: Query;
  setQuery: (params: {
    id: string;
    inspect: inputsModel.InspectQuery | null;
    loading: boolean;
    refetch: inputsModel.Refetch;
  }) => void;
  to: number;
}

const AlertsByCategoryComponent: React.FC<Props> = ({
  deleteQuery,
  filters = NO_FILTERS,
  from,
  hideHeaderChildren = false,
  indexPattern,
  query = DEFAULT_QUERY,
  setQuery,
  to,
}) => {
  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, []);

  const kibana = useKibana();
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const urlSearch = useGetUrlSearch(navTabs.hosts);

  const alertsCountViewAlertsButton = useMemo(
    () => (
      <EuiButton
        data-test-subj="view-alerts"
        href={getTabsOnHostsUrl(HostsTableType.alerts, urlSearch)}
      >
        {i18n.VIEW_ALERTS}
      </EuiButton>
    ),
    [urlSearch]
  );

  const alertsByCategoryHistogramConfigs: MatrixHisrogramConfigs = useMemo(
    () => ({
      ...histogramConfigs,
      defaultStackByOption:
        alertsStackByOptions.find((o) => o.text === DEFAULT_STACK_BY) ?? alertsStackByOptions[0],
      subtitle: (totalCount: number) =>
        `${SHOWING}: ${numeral(totalCount).format(defaultNumberFormat)} ${UNIT(totalCount)}`,
      legendPosition: Position.Right,
    }),
    []
  );

  return (
    <MatrixHistogramContainer
      endDate={to}
      filterQuery={convertToBuildEsQuery({
        config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
        indexPattern,
        queries: [query],
        filters,
      })}
      headerChildren={hideHeaderChildren ? null : alertsCountViewAlertsButton}
      id={ID}
      setQuery={setQuery}
      sourceId="default"
      startDate={from}
      type={HostsType.page}
      {...alertsByCategoryHistogramConfigs}
    />
  );
};

AlertsByCategoryComponent.displayName = 'AlertsByCategoryComponent';

export const AlertsByCategory = React.memo(AlertsByCategoryComponent);
