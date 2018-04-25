/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import { TableHead } from './tableHead';
import { TableBody } from './tableBody';

export class ClusterView extends React.Component {
  static displayName = 'ClusterView';

  constructor(props) {
    super(props);
    const scope = props.scope;
    const kbnChangePath = props.kbnUrl.changePath;

    this.state = {
      labels: props.scope.labels || [],
      showing: props.scope.showing || [],
      shardStats: props.shardStats,
      showSystemIndices: props.showSystemIndices,
      toggleShowSystemIndices: props.toggleShowSystemIndices,
      angularChangeUrl: (url) => {
        scope.$evalAsync(() => kbnChangePath(url));
      }
    };
  }

  setShowing = (data) => {
    if (data) {
      this.setState({ showing: data });
    }
  };

  setShardStats = (stats) => {
    this.setState({ shardStats: stats });
  };

  componentWillMount() {
    this.props.scope.$watch('showing', this.setShowing);
    this.props.scope.$watch('shardStats', this.setShardStats);
  }

  hasUnassigned = () => {
    return this.state.showing.length &&
      this.state.showing[0].unassigned &&
      this.state.showing[0].unassigned.length;
  };

  render() {
    return (
      <table cellPadding="0" cellSpacing="0" className="table">
        <TableHead
          hasUnassigned={this.hasUnassigned()}
          scope={this.props.scope}
          toggleShowSystemIndices={this.state.toggleShowSystemIndices}
        />
        <TableBody
          filter={this.props.scope.filter}
          totalCount={this.props.scope.totalCount}
          rows={this.state.showing}
          cols={this.state.labels.length}
          shardStats={this.state.shardStats}
          changeUrl={this.state.angularChangeUrl}
        />
      </table>
    );
  }
}
