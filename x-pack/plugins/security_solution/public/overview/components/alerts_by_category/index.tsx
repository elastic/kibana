/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import React, { useEffect, useMemo, useCallback } from 'react';
import { Position } from '@elastic/charts';

import { DEFAULT_NUMBER_FORMAT, APP_ID } from '../../../../common/constants';
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
import { HostsTableType, HostsType } from '../../../hosts/store/model';

import * as i18n from '../../pages/translations';
import {
  alertsStackByOptions,
  histogramConfigs,
} from '../../../common/components/alerts_viewer/histogram_configs';
import { MatrixHisrogramConfigs } from '../../../common/components/matrix_histogram/types';
import { getTabsOnHostsUrl } from '../../../common/components/link_to/redirect_to_hosts';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { SecurityPageName } from '../../../app/types';
import { useFormatUrl } from '../../../common/components/link_to';
import { LinkButton } from '../../../common/components/links';

const ID = 'alertsByCategoryOverview';

const NO_FILTERS: Filter[] = [];
const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };
const DEFAULT_STACK_BY = 'event.module';

interface Props extends Pick<GlobalTimeArgs, 'from' | 'to' | 'deleteQuery' | 'setQuery'> {
  filters?: Filter[];
  hideHeaderChildren?: boolean;
  indexPattern: IIndexPattern;
  query?: Query;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kibana = useKibana();
  const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.hosts);
  const { navigateToApp } = kibana.services.application;
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const goToHostAlerts = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(`${APP_ID}:${SecurityPageName.hosts}`, {
        path: getTabsOnHostsUrl(HostsTableType.alerts, urlSearch),
      });
    },
    [navigateToApp, urlSearch]
  );

  const alertsCountViewAlertsButton = useMemo(
    () => (
      <LinkButton
        data-test-subj="view-alerts"
        onClick={goToHostAlerts}
        href={formatUrl(getTabsOnHostsUrl(HostsTableType.alerts))}
      >
        {i18n.VIEW_ALERTS}
      </LinkButton>
    ),
    [goToHostAlerts, formatUrl]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
