/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBoxOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Query } from 'react-apollo';
import { UMPingSortDirectionArg } from '../../../../common/domain_types';
import { UptimeCommonProps } from '../../../uptime_app';
import { PingList } from '../../functional';
import { getPingsQuery } from './get_pings';

const DEFAULT_MAX_SEARCH_SIZE = 100;

interface PingListProps {
  monitorId?: string;
  sort?: UMPingSortDirectionArg;
  size?: number;
}

type Props = PingListProps & UptimeCommonProps;

interface PingListState {
  statusOptions: EuiComboBoxOptionProps[];
  selectedOption: EuiComboBoxOptionProps;
  maxSearchSize: number;
}

export class PingListQuery extends React.Component<Props, PingListState> {
  constructor(props: Props) {
    super(props);

    const statusOptions = [
      {
        label: i18n.translate('xpack.uptime.pingList.statusOptions.allStatusOptionLabel', {
          defaultMessage: 'All',
        }),
        value: '',
      },
      {
        label: i18n.translate('xpack.uptime.pingList.statusOptions.upStatusOptionLabel', {
          defaultMessage: 'Up',
        }),
        value: 'up',
      },
      {
        label: i18n.translate('xpack.uptime.pingList.statusOptions.downStatusOptionLabel', {
          defaultMessage: 'Down',
        }),
        value: 'down',
      },
    ];
    this.state = {
      statusOptions,
      selectedOption: statusOptions[2],
      maxSearchSize: DEFAULT_MAX_SEARCH_SIZE,
    };
  }
  public render() {
    const {
      monitorId,
      dateRangeStart,
      dateRangeEnd,
      autorefreshIsPaused,
      autorefreshInterval,
      sort,
      size,
    } = this.props;
    const { selectedOption } = this.state;
    return (
      <Query
        pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
        variables={{
          monitorId,
          dateRangeStart,
          dateRangeEnd,
          status:
            selectedOption.value === 'up' || selectedOption.value === 'down'
              ? selectedOption.value
              : '',
          // TODO: get rid of the magic number
          size: this.state.maxSearchSize || size || DEFAULT_MAX_SEARCH_SIZE,
          sort: sort || 'desc',
        }}
        query={getPingsQuery}
      >
        {({ loading, error, data }) => {
          if (error) {
            return i18n.translate('xpack.uptime.pingList.errorMessage', {
              values: { message: error.message },
              defaultMessage: 'Error {message}',
            });
          }
          const { allPings } = data;
          return (
            <PingList
              loading={loading}
              maxSearchSize={this.state.maxSearchSize}
              pingResults={allPings}
              searchSizeOnBlur={this.onSearchSizeBlur}
              selectedOption={this.state.selectedOption}
              selectedOptionChanged={this.onSelectedOptionChange}
              statusOptions={this.state.statusOptions}
            />
          );
        }}
      </Query>
    );
  }

  private onSearchSizeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const sanitizedValue = parseInt(e.target.value, 10);
    if (!isNaN(sanitizedValue)) {
      this.setState({
        maxSearchSize: sanitizedValue >= 10000 ? 10000 : sanitizedValue,
      });
    }
  };

  private onSelectedOptionChange = (selectedOptions: EuiComboBoxOptionProps[]) => {
    if (selectedOptions[0]) {
      this.setState({ selectedOption: selectedOptions[0] });
    }
  };
}
