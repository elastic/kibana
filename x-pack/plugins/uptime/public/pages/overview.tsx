/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { useGetUrlParams } from '../hooks';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';
import { PageHeader } from './page_header';
import { useUpdateKueryString } from '../hooks';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { useTrackPageview } from '../../../observability/public';
import {
  EmptyState,
  FilterGroupComponent,
  KueryBar,
  MonitorListComponent,
  ParsingErrorCallout,
} from '../components/overview';
import { StatusPanel } from '../components/overview/status_panel';
import { useDispatch, useSelector } from 'react-redux';
import { setEsKueryString } from '../state/actions';
import { selectIndexPattern } from '../state/selectors';
import { useOverviewPageData } from '../components/overview/use_overview_data';
import { getPageSizeValue } from '../components/overview/monitor_list/use_monitor_list';

const EuiFlexItemStyled = styled(EuiFlexItem)`
  && {
    min-width: 598px;
    @media only screen and (max-width: 1128px) {
      min-width: 500px;
    }
    @media only screen and (max-width: 630px) {
      min-width: initial;
    }
  }
`;

export const OverviewPage = React.memo(({}) => {
  const { absoluteDateRangeStart, absoluteDateRangeEnd, ...params } = useGetUrlParams();
  const { search, filters: urlFilters } = params;

  useTrackPageview({ app: 'uptime', path: 'overview' });
  useTrackPageview({ app: 'uptime', path: 'overview', delay: 15000 });

  const [pageSize, setPageSize] = useState<number>(getPageSizeValue());

  const { loading } = useSelector(selectIndexPattern);

  const [esFilters, error] = useUpdateKueryString(search, urlFilters);

  useOverviewPageData({ pageSize, esKueryFilters: esFilters });

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setEsKueryString(esFilters ?? ''));
  }, [esFilters, dispatch]);

  const linkParameters = stringifyUrlParams(params, true);

  const heading = i18n.translate('xpack.uptime.overviewPage.headerText', {
    defaultMessage: 'Overview',
    description: `The text that will be displayed in the app's heading when the Overview page loads.`,
  });

  useBreadcrumbs([]); // No extra breadcrumbs on overview

  return (
    <>
      <PageHeader headingText={heading} extraLinks={true} datePicker={true} />
      <EmptyState>
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          <EuiFlexItem grow={1} style={{ flexBasis: 485 }}>
            <KueryBar
              aria-label={i18n.translate('xpack.uptime.filterBar.ariaLabel', {
                defaultMessage: 'Input filter criteria for the overview page',
              })}
              data-test-subj="xpack.uptime.filterBar"
            />
          </EuiFlexItem>
          <EuiFlexItemStyled grow={true}>
            <FilterGroupComponent />
          </EuiFlexItemStyled>
          {error && !loading && <ParsingErrorCallout error={error} />}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <StatusPanel />
        <EuiSpacer size="s" />
        <MonitorListComponent
          esKueryFilters={esFilters}
          linkParameters={linkParameters}
          setPageSize={setPageSize}
          pageSize={pageSize}
        />
      </EmptyState>
    </>
  );
});
