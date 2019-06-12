/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore EuiSearchBar missing
import { EuiSearchBar, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment, useContext, useEffect } from 'react';
import { getOverviewPageBreadcrumbs } from '../breadcrumbs';
import { EmptyState, ErrorList, FilterBar, MonitorList, Snapshot } from '../components/functional';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { UptimeSettingsContext } from '../contexts';
import { useUrlParams } from '../hooks';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';

interface OverviewPageProps {
  basePath: string;
  history: any;
  location: {
    pathname: string;
    search: string;
  };
  setBreadcrumbs: UMUpdateBreadcrumbs;
}

type Props = OverviewPageProps;

export type UptimeSearchBarQueryChangeHandler = ({ query }: { query?: { text: string } }) => void;

export const OverviewPage = ({ basePath, setBreadcrumbs, history, location }: Props) => {
  const { colors, refreshApp, setHeadingText } = useContext(UptimeSettingsContext);
  const [params, updateUrl] = useUrlParams(history, location);
  const { dateRangeStart, dateRangeEnd, search } = params;

  useEffect(() => {
    setBreadcrumbs(getOverviewPageBreadcrumbs());
    if (setHeadingText) {
      setHeadingText(
        i18n.translate('xpack.uptime.overviewPage.headerText', {
          defaultMessage: 'Overview',
          description: `The text that will be displayed in the app's heading when the Overview page loads.`,
        })
      );
    }
  }, []);

  const filterQueryString = search || '';
  const sharedProps = {
    dateRangeStart,
    dateRangeEnd,
    filters: search ? JSON.stringify(EuiSearchBar.Query.toESQuery(filterQueryString)) : undefined,
  };

  const updateQuery: UptimeSearchBarQueryChangeHandler = ({ query }) => {
    try {
      if (query && typeof query.text !== 'undefined') {
        updateUrl({ search: query.text });
      }
      if (refreshApp) {
        refreshApp();
      }
    } catch (e) {
      updateUrl({ search: '' });
    }
  };

  const linkParameters = stringifyUrlParams(params);

  return (
    <Fragment>
      <EmptyState basePath={basePath} implementsCustomErrorState={true} variables={sharedProps}>
        <FilterBar
          currentQuery={filterQueryString}
          updateQuery={updateQuery}
          variables={sharedProps}
        />
        <EuiSpacer size="s" />
        <Snapshot colors={colors} variables={sharedProps} />
        <EuiSpacer size="s" />
        <MonitorList
          basePath={basePath}
          dangerColor={colors.danger}
          dateRangeStart={dateRangeStart}
          dateRangeEnd={dateRangeEnd}
          linkParameters={linkParameters}
          variables={sharedProps}
        />
        <EuiSpacer size="s" />
        <ErrorList linkParameters={linkParameters} variables={sharedProps} />
      </EmptyState>
    </Fragment>
  );
};
