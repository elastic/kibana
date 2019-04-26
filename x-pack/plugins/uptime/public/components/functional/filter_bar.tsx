/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore No typings for EuiSearchBar
import { EuiIcon, EuiSearchBar, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FilterBar as FilterBarType, MonitorKey } from '../../../common/graphql/types';
import { UptimeSearchBarQueryChangeHandler } from '../../pages/overview';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { filterBarQuery } from '../../queries';
import { FilterBarLoading } from './filter_bar_loading';
import { filterBarSearchSchema } from './search_schema';

interface FilterBarQueryResult {
  filterBar?: FilterBarType;
}

interface FilterBarProps {
  currentQuery?: string;
  updateQuery: UptimeSearchBarQueryChangeHandler;
}

type Props = FilterBarProps & UptimeGraphQLQueryProps<FilterBarQueryResult>;

const SEARCH_THRESHOLD = 2;

export const FilterBarComponent = ({ currentQuery, data, updateQuery }: Props) => {
  if (!data || !data.filterBar) {
    return <FilterBarLoading />;
  }
  const {
    filterBar: { ids, names, ports, schemes },
  } = data;
  // TODO: add a factory function + type for these filter options
  const filters = [
    {
      type: 'field_value_toggle_group',
      field: 'monitor.status',
      items: [
        {
          value: 'up',
          name: i18n.translate('xpack.uptime.filterBar.filterUpLabel', {
            defaultMessage: 'Up',
          }),
        },
        {
          value: 'down',
          name: i18n.translate('xpack.uptime.filterBar.filterDownLabel', {
            defaultMessage: 'Down',
          }),
        },
      ],
    },
    // TODO: add health to this select
    {
      type: 'field_value_selection',
      field: 'monitor.id',
      name: i18n.translate('xpack.uptime.filterBar.options.idLabel', {
        defaultMessage: 'ID',
      }),
      multiSelect: false,
      options: ids
        ? ids.map(({ key }: MonitorKey) => ({
            value: key,
            view: key,
          }))
        : [],
      searchThreshold: SEARCH_THRESHOLD,
    },
    {
      type: 'field_value_selection',
      field: 'monitor.name',
      name: i18n.translate('xpack.uptime.filterBar.options.nameLabel', {
        defaultMessage: 'Name',
      }),
      multiSelect: false,
      options: names
        ? names.map((nameValue: string) => ({ value: nameValue, view: nameValue }))
        : [],
      searchThreshold: SEARCH_THRESHOLD,
    },
    {
      type: 'field_value_selection',
      field: 'url.full',
      name: i18n.translate('xpack.uptime.filterBar.options.urlLabel', {
        defaultMessage: 'URL',
      }),
      multiSelect: false,
      options: ids ? ids.map(({ url }: MonitorKey) => ({ value: url, view: url })) : [],
      searchThreshold: SEARCH_THRESHOLD,
    },
    {
      type: 'field_value_selection',
      field: 'url.port',
      name: i18n.translate('xpack.uptime.filterBar.options.portLabel', {
        defaultMessage: 'Port',
      }),
      multiSelect: false,
      options: ports
        ? ports.map((portValue: any) => ({
            value: portValue,
            view: portValue,
          }))
        : [],
      searchThreshold: SEARCH_THRESHOLD,
    },
    {
      type: 'field_value_selection',
      field: 'monitor.type',
      name: i18n.translate('xpack.uptime.filterBar.options.schemeLabel', {
        defaultMessage: 'Scheme',
      }),
      multiSelect: false,
      options: schemes
        ? schemes.map((schemeValue: string) => ({
            value: schemeValue,
            view: schemeValue,
          }))
        : [],
      searchThreshold: SEARCH_THRESHOLD,
    },
  ];
  return (
    <div data-test-subj="xpack.uptime.filterBar">
      <EuiSearchBar
        box={{ incremental: false }}
        className="euiFlexGroup--gutterSmall"
        onChange={updateQuery}
        filters={filters}
        query={currentQuery}
        schema={filterBarSearchSchema}
      />
    </div>
  );
};

export const FilterBar = withUptimeGraphQL<FilterBarQueryResult, FilterBarProps>(
  FilterBarComponent,
  filterBarQuery
);
