/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiText, EuiTitle, EuiLink, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { EuiMonitoringTable } from 'plugins/monitoring/components/table';
import { RecoveryIndex } from './recovery_index';
import { TotalTime } from './total_time';
import { SourceDestination } from './source_destination';
import { FilesProgress, BytesProgress, TranslogProgress } from './progress';
import { parseProps } from './parse_props';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

const columns = [
  {
    name: i18n.translate('xpack.monitoring.kibana.shardActivity.indexTitle', {
      defaultMessage: 'Index'
    }),
    field: 'name',
    render: (_name, shard) => <RecoveryIndex {...shard} />
  },
  {
    name: i18n.translate('xpack.monitoring.kibana.shardActivity.stageTitle', {
      defaultMessage: 'Stage'
    }),
    field: 'stage'
  },
  {
    name: i18n.translate('xpack.monitoring.kibana.shardActivity.totalTimeTitle', {
      defaultMessage: 'Total Time'
    }),
    field: null,
    render: shard => <TotalTime {...shard} />
  },
  {
    name: i18n.translate('xpack.monitoring.kibana.shardActivity.sourceDestinationTitle', {
      defaultMessage: 'Source / Destination'
    }),
    field: null,
    render: shard => <SourceDestination {...shard} />
  },
  {
    name: i18n.translate('xpack.monitoring.kibana.shardActivity.filesTitle', {
      defaultMessage: 'Files'
    }),
    field: null,
    render: shard => <FilesProgress {...shard} />
  },
  {
    name: i18n.translate('xpack.monitoring.kibana.shardActivity.bytesTitle', {
      defaultMessage: 'Bytes'
    }),
    field: null,
    render: shard => <BytesProgress {...shard} />
  },
  {
    name: i18n.translate('xpack.monitoring.kibana.shardActivity.translogTitle', {
      defaultMessage: 'Translog'
    }),
    field: null,
    render: shard => <TranslogProgress {...shard} />
  }
];


export class ShardActivity extends React.Component {
  constructor(props) {
    super(props);
    this.getNoDataMessage = this.getNoDataMessage.bind(this);
  }

  getNoDataMessage() {
    if (this.props.showShardActivityHistory) {
      return i18n.translate('xpack.monitoring.elasticsearch.shardActivity.noDataMessage', {
        defaultMessage: 'There are no historical shard activity records for the selected time range.'
      });
    }
    return (
      <Fragment>
        <FormattedMessage
          id="xpack.monitoring.elasticsearch.shardActivity.noActiveShardRecoveriesMessage.completedRecoveriesLinkTextProblem"
          defaultMessage="There are no active shard recoveries for this cluster."
        /><br />
        <FormattedMessage
          id="xpack.monitoring.elasticsearch.shardActivity.noActiveShardRecoveriesMessage.completedRecoveriesLinkTextSolution"
          defaultMessage="Try viewing {shardActivityHistoryLink}."
          values={{
            shardActivityHistoryLink: (
              <EuiLink onClick={this.props.toggleShardActivityHistory}>
                <FormattedMessage
                  id="xpack.monitoring.elasticsearch.shardActivity.noActiveShardRecoveriesMessage.completedRecoveriesLinkText"
                  defaultMessage="completed recoveries"
                />
              </EuiLink>
            )
          }}
        />
      </Fragment>
    );
  }

  render() {
    // data prop is an array of table row data, or null (which triggers no data message)
    const {
      data: rawData,
      sorting,
      pagination,
      onTableChange,
      toggleShardActivityHistory,
      showShardActivityHistory
    } = this.props;

    if (rawData === null) {
      return null;
    }

    const rows = rawData.map(parseProps);

    return (
      <Fragment>
        <EuiText>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.monitoring.elasticsearch.shardActivityTitle"
                defaultMessage="Shard Activity"
              />
            </h2>
          </EuiTitle>
        </EuiText>
        <EuiSpacer />
        <EuiSwitch
          id="monitoring_completed_recoveries"
          label={(
            <FormattedMessage
              id="xpack.monitoring.elasticsearch.shardActivity.completedRecoveriesLabel"
              defaultMessage="Completed recoveries"
            />
          )}
          onChange={toggleShardActivityHistory}
          checked={showShardActivityHistory}
        />
        <EuiSpacer/>
        <EuiMonitoringTable
          className="esShardActivityTable"
          rows={rows}
          columns={columns}
          message={this.getNoDataMessage()}
          sorting={sorting}
          search={false}
          pagination={pagination}
          onTableChange={onTableChange}
          executeQueryOptions={{
            defaultFields: ['name']
          }}
        />
      </Fragment>
    );
  }
}
