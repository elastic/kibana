/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiText, EuiTitle, EuiLink, EuiSpacer, EuiSwitch } from '@elastic/eui';
import {
  KuiTableRowCell,
  KuiTableRow,
  KuiToolBarSection,
  KuiToolBarText
} from '@kbn/ui-framework/components';
import { MonitoringTable } from 'plugins/monitoring/components/table';
import { RecoveryIndex } from './recovery_index';
import { TotalTime } from './total_time';
import { SourceDestination } from './source_destination';
import { FilesProgress, BytesProgress, TranslogProgress } from './progress';
import { parseProps } from './parse_props';

const columns = [
  { title: 'Index', sortKey: null },
  { title: 'Stage', sortKey: null },
  { title: 'Total Time', sortKey: null },
  { title: 'Source / Destination', sortKey: null },
  { title: 'Files', sortKey: null },
  { title: 'Bytes', sortKey: null },
  { title: 'Translog', sortKey: null }
];
const ActivityRow = props => (
  <KuiTableRow>
    <KuiTableRowCell>
      <RecoveryIndex {...props} />
    </KuiTableRowCell>
    <KuiTableRowCell>{props.stage}</KuiTableRowCell>
    <KuiTableRowCell>
      <TotalTime {...props} />
    </KuiTableRowCell>
    <KuiTableRowCell>
      <SourceDestination {...props} />
    </KuiTableRowCell>
    <KuiTableRowCell>
      <FilesProgress {...props} />
    </KuiTableRowCell>
    <KuiTableRowCell>
      <BytesProgress {...props} />
    </KuiTableRowCell>
    <KuiTableRowCell>
      <TranslogProgress {...props} />
    </KuiTableRowCell>
  </KuiTableRow>
);

const ToggleCompletedSwitch = ({ toggleHistory, showHistory }) => (
  <KuiToolBarSection>
    <KuiToolBarText>
      <EuiSwitch
        label="Completed recoveries"
        onChange={toggleHistory}
        checked={showHistory}
      />
    </KuiToolBarText>
  </KuiToolBarSection>
);

export class ShardActivity extends React.Component {
  constructor(props) {
    super(props);
    this.getNoDataMessage = this.getNoDataMessage.bind(this);
  }

  getNoDataMessage() {
    if (this.props.showShardActivityHistory) {
      return 'There are no historical shard activity records for the selected time range.';
    }
    return (
      <Fragment>
        There are no active shard recoveries for this cluster.<br />
        Try viewing <EuiLink onClick={this.props.toggleShardActivityHistory}>completed recoveries</EuiLink>.
      </Fragment>
    );
  }

  render() {
    // data prop is an array of table row data, or null (which triggers no data message)
    const { data: rawData } = this.props;
    if (rawData === null) {
      return null;
    }
    const rows = rawData.map(parseProps);

    const renderToolBarSection = props => (
      <ToggleCompletedSwitch
        toggleHistory={props.toggleShardActivityHistory}
        showHistory={props.showShardActivityHistory}
      />
    );

    return (
      <Fragment>
        <EuiText>
          <EuiTitle size="s">
            <h2>Shard Activity</h2>
          </EuiTitle>
        </EuiText>
        <EuiSpacer />
        <MonitoringTable
          className="esShardActivityTable"
          rows={rows}
          renderToolBarSections={renderToolBarSection}
          columns={columns}
          rowComponent={ActivityRow}
          getNoDataMessage={this.getNoDataMessage}
          alwaysShowPageControls={true}
          {...this.props}
        />
      </Fragment>
    );
  }
}
