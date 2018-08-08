/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import { Unassigned } from './unassigned';
import { Assigned } from './assigned';

const ShardRow = props => {
  let unassigned;
  if (props.data.unassigned && props.data.unassigned.length) {
    unassigned = (
      <Unassigned shards={props.data.unassigned}/>
    );
  } else {
    if (props.cols === 3) {
      unassigned = (<td />);
    }
  }
  return (
    <tr>
      { unassigned }
      <Assigned
        shardStats={props.shardStats}
        data={props.data.children}
        changeUrl={props.changeUrl}
      />
    </tr>
  );
};

export class TableBody extends React.Component {
  static displayName = 'TableBody';

  createRow = (data, index) => {
    return (
      <ShardRow
        key={`shardRow-${index}`}
        data={data}
        {...this.props}
        changeUrl={this.props.changeUrl}
      />
    );
  };

  render() {
    if (this.props.totalCount === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan={this.props.cols}>
              <div>
                <p style={{ margin: '10px 0' }} className="text-center lead">
                  There are no shards allocated.
                </p>
              </div>
            </td>
          </tr>
        </tbody>
      );
    }

    if (this.props.shardStats) {
      if (this.props.rows.length) {
        return (
          <tbody>
            { this.props.rows.map(this.createRow) }
          </tbody>
        );
      }
    }

    return (
      <tbody>
        <tr>
          <td colSpan={this.props.cols} />
        </tr>
      </tbody>
    );

  }
}
