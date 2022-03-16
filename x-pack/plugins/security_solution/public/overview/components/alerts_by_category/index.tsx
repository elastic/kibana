/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import React, { useEffect, useMemo, useCallback } from 'react';
import { Position } from '@elastic/charts';
import styled from 'styled-components';

import type { DataViewBase, Filter, Query } from '@kbn/es-query';
import { EuiButton } from '@elastic/eui';
import { DEFAULT_NUMBER_FORMAT, APP_UI_ID } from '../../../../common/constants';
import { SHOWING, UNIT } from '../../../common/components/alerts_viewer/translations';
import { MatrixHistogram } from '../../../common/components/matrix_histogram';
import { useKibana, useUiSetting$ } from '../../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../../common/lib/keury';
import { getEsQueryConfig } from '../../../../../../../src/plugins/data/common';
import { HostsTableType } from '../../../hosts/store/model';

import * as i18n from '../../pages/translations';
import {
  alertsStackByOptions,
  histogramConfigs,
} from '../../../common/components/alerts_viewer/histogram_configs';
import { MatrixHistogramConfigs } from '../../../common/components/matrix_histogram/types';
import { getTabsOnHostsUrl } from '../../../common/components/link_to/redirect_to_hosts';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { SecurityPageName } from '../../../app/types';
import { useFormatUrl } from '../../../common/components/link_to';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';

const ID = 'alertsByCategoryOverview';

const DEFAULT_STACK_BY = 'event.module';

const StyledLinkButton = styled(EuiButton)`
  margin-left: ${({ theme }) => theme.eui.paddingSizes.l};
`;
interface Props extends Pick<GlobalTimeArgs, 'from' | 'to' | 'deleteQuery' | 'setQuery'> {
  filters: Filter[];
  hideHeaderChildren?: boolean;
  indexPattern: DataViewBase;
  indexNames: string[];
  query: Query;
}

const AlertsByCategoryComponent: React.FC<Props> = ({
  deleteQuery,
  filters,
  from,
  hideHeaderChildren = false,
  indexPattern,
  indexNames,
  query,
  setQuery,
  to,
}) => {
  const {
    uiSettings,
    application: { navigateToApp },
  } = useKibana().services;
  const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.hosts);
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const goToHostAlerts = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.hosts,
        path: getTabsOnHostsUrl(HostsTableType.alerts, urlSearch),
      });
    },
    [navigateToApp, urlSearch]
  );

  const alertsCountViewAlertsButton = useMemo(
    () => (
      <StyledLinkButton
        data-test-subj="view-alerts"
        onClick={goToHostAlerts}
        href={formatUrl(getTabsOnHostsUrl(HostsTableType.alerts))}
      >
        {i18n.VIEW_ALERTS}
      </StyledLinkButton>
    ),
    [goToHostAlerts, formatUrl]
  );

  const alertsByCategoryHistogramConfigs: MatrixHistogramConfigs = useMemo(
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

  const [filterQuery, kqlError] = useMemo(
    () =>
      convertToBuildEsQuery({
        config: getEsQueryConfig(uiSettings),
        indexPattern,
        queries: [query],
        filters,
      }),
    [filters, indexPattern, uiSettings, query]
  );

  useInvalidFilterQuery({ id: ID, filterQuery, kqlError, query, startDate: from, endDate: to });

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, [deleteQuery]);

  return (
    <MatrixHistogram
      endDate={to}
      filterQuery={filterQuery}
      headerChildren={hideHeaderChildren ? null : alertsCountViewAlertsButton}
      id={ID}
      indexNames={indexNames}
      setQuery={setQuery}
      startDate={from}
      {...alertsByCategoryHistogramConfigs}
    />
  );
};

AlertsByCategoryComponent.displayName = 'AlertsByCategoryComponent';

export const AlertsByCategory = React.memo(AlertsByCategoryComponent);
