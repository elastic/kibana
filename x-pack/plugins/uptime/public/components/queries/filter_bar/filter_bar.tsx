/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore No typings for EuiSearchBar
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSearchBar, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { take } from 'lodash';
import React from 'react';
import { Query } from 'react-apollo';
import { FilterBar as FilterBarType } from '../../../../common/graphql/types';
import { UptimeCommonProps } from '../../../uptime_app';
import { getFilterBarQuery } from './get_filter_bar';
import { filterBarSearchSchema } from './search_schema';

interface FilterBarProps {
  updateQuery: (query: object | undefined) => void;
}

type Props = FilterBarProps & UptimeCommonProps;

const MAX_SELECTION_LENGTH = 20;
const SEARCH_THRESHOLD = 2;

export const FilterBar = ({ dateRangeEnd, dateRangeStart, updateQuery }: Props) => (
  <Query query={getFilterBarQuery} variables={{ dateRangeStart, dateRangeEnd }}>
    {({ loading, error, data }) => {
      if (loading) {
        return i18n.translate('xpack.uptime.filterBar.loadingMessage', {
          defaultMessage: 'Loading…',
        });
      }
      if (error) {
        return i18n.translate('xpack.uptime.filterBar.errorMessage', {
          values: { message: error.message },
          defaultMessage: 'Error {message}',
        });
      }
      const {
        filterBar: { ports, ids, schemes },
      }: { filterBar: FilterBarType } = data;
      const showFilterDisclaimer =
        (ids && ids.length && ids.length > MAX_SELECTION_LENGTH) ||
        (ports && ports.length && ports.length > MAX_SELECTION_LENGTH);

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
            ? take(ids, MAX_SELECTION_LENGTH).map(({ key, url }: any) => ({
                value: key,
                view: url,
              }))
            : [],
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
            ? take(ports, MAX_SELECTION_LENGTH).map((portValue: any) => ({
                value: portValue,
                view: portValue,
              }))
            : [],
          searchThreshold: SEARCH_THRESHOLD,
        },
        {
          type: 'field_value_selection',
          field: 'monitor.type',
          name: i18n.translate('xpack.uptime.filterBar.options.typeLabel', {
            defaultMessage: 'Type',
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
        <EuiFlexGroup>
          <EuiFlexItem grow>
            <EuiSearchBar
              // TODO: update typing
              onChange={({ query }: { query?: { text: string } }) => {
                try {
                  let esQuery;
                  if (query && query.text) {
                    esQuery = EuiSearchBar.Query.toESQuery(query);
                  }
                  updateQuery(esQuery);
                } catch (e) {
                  updateQuery(undefined);
                }
              }}
              filters={filters}
              schema={filterBarSearchSchema}
            />
          </EuiFlexItem>
          {showFilterDisclaimer && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="left"
                title={i18n.translate('xpack.uptime.filterBar.filterLimitationsTooltipTitle', {
                  defaultMessage: 'Filter limitations',
                })}
                content={i18n.translate('xpack.uptime.filterBar.filterLimitationsTooltipText', {
                  values: { selectionLength: MAX_SELECTION_LENGTH },
                  defaultMessage:
                    'The top {selectionLength} filter options for each field are displayed, but you can modify the filters manually or search for additional values.',
                })}
              >
                <EuiIcon type="iInCircle" size="l" />
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    }}
  </Query>
);
