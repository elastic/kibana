/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPageHeaderContentProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { compact } from 'lodash';
import React, { useEffect, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useHistory } from 'react-router-dom';
import { INDEX_EVENTS } from '../../../common';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';

export function ProfilingAppPageTemplate({
  children,
  tabs,
}: {
  children: React.ReactElement;
  tabs: EuiPageHeaderContentProps['tabs'];
}) {
  const {
    path,
    query,
    query: { rangeFrom, rangeTo, kuery },
  } = useProfilingParams('/*');

  const {
    start: { observability, data, dataViews },
  } = useProfilingDependencies();

  const { PageTemplate: ObservabilityPageTemplate } = observability.navigation;

  const profilingRouter = useProfilingRouter();
  const routePath = useProfilingRoutePath();

  const [dataView, setDataView] = useState<DataView>();

  const history = useHistory();

  useEffect(() => {
    // set time if both to and from are given in the url
    if (rangeFrom && rangeTo) {
      data.query.timefilter.timefilter.setTime({
        from: rangeFrom,
        to: rangeTo,
      });
      return;
    }
  }, [rangeFrom, rangeTo, data]);

  useEffect(() => {
    dataViews
      .create({
        title: INDEX_EVENTS,
      })
      .then((nextDataView) => setDataView(nextDataView));
  }, [dataViews]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [history.location.pathname]);

  const searchBarQuery: Required<React.ComponentProps<typeof SearchBar>>['query'] = {
    language: 'kuery',
    query: kuery,
  };

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        paddingSize: 's',
        pageTitle: i18n.translate('xpack.profiling.appPageTemplate.pageTitle', {
          defaultMessage: 'Profiling',
        }),
        tabs,
      }}
      pageBodyProps={{
        paddingSize: 'none',
      }}
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <SearchBar
            onQuerySubmit={(next) => {
              profilingRouter.push(routePath, {
                path,
                query: {
                  ...query,
                  kuery: next.query?.query || '',
                  rangeFrom: next.dateRange.from,
                  rangeTo: next.dateRange.to,
                },
              });
            }}
            showQueryBar
            showQueryInput
            showDatePicker
            showFilterBar={false}
            showSaveQuery={false}
            query={searchBarQuery}
            dateRangeFrom={rangeFrom}
            dateRangeTo={rangeTo}
            indexPatterns={compact([dataView])}
            onRefresh={(nextDateRange) => {
              profilingRouter.push(routePath, {
                path,
                query: {
                  ...query,
                  rangeFrom: nextDateRange.dateRange.from,
                  rangeTo: nextDateRange.dateRange.to,
                },
              });
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
