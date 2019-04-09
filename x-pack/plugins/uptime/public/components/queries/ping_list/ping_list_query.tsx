/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBoxOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import React from 'react';
import { UMPingSortDirectionArg } from '../../../../common/domain_types';
import { PingResults } from '../../../../common/graphql/types';
import { UptimeCommonProps } from '../../../uptime_app';
import { PingList } from '../../functional';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../../higher_order';
import { getPingsQuery } from './get_pings';

interface PingListQueryResult {
  allPings?: PingResults;
}

interface PingListProps {
  monitorId?: string;
  selectedOption?: EuiComboBoxOptionProps;
  sort?: UMPingSortDirectionArg;
  size?: number;
  onStatusSelectionChange: (selectedOptions: EuiComboBoxOptionProps[]) => void;
}

type Props = PingListProps &
  UptimeCommonProps &
  UptimeGraphQLQueryProps<PingListQueryResult> &
  PingListProps;

interface PingListState {
  statusOptions: EuiComboBoxOptionProps[];
}

export class Query extends React.Component<Props, PingListState> {
  constructor(props: Props) {
    super(props);

    const statusOptions: EuiComboBoxOptionProps[] = [
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
    };
    this.props.onStatusSelectionChange([this.state.statusOptions[2]]);
  }

  public render() {
    const { loading, data } = this.props;
    const allPings: PingResults | undefined = get(data, 'allPings', undefined);
    return (
      <PingList
        loading={loading}
        pingResults={allPings}
        selectedOption={this.props.selectedOption || this.state.statusOptions[2]}
        selectedOptionChanged={this.props.onStatusSelectionChange}
        statusOptions={this.state.statusOptions}
      />
    );
  }
}

export const PingListQuery = withUptimeGraphQL<PingListQueryResult, PingListProps>(
  Query,
  getPingsQuery
);
