/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

class IndexLabel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showSystemIndices: props.scope.showSystemIndices,
    };
    this.toggleShowSystemIndicesState = this.toggleShowSystemIndicesState.bind(this);
  }

  // See also public/directives/index_listing/index
  toggleShowSystemIndicesState(e) {
    const isChecked = e.target.checked;
    this.setState({ showSystemIndices: isChecked });
    this.props.scope.$evalAsync(() => {
      this.props.toggleShowSystemIndices(isChecked);
    });
  }

  render() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.monitoring.elasticsearch.shardAllocation.tableHead.indicesLabel"
            defaultMessage="Indices"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSwitch
            label="System indices"
            onChange={this.toggleShowSystemIndicesState}
            checked={this.state.showSystemIndices}
            data-test-subj="shardShowSystemIndices"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}

// eslint-disable-next-line react/no-multi-comp
export class TableHead extends React.Component {
  constructor(props) {
    super(props);
  }

  createColumn({ key, content }) {
    return (
      <th scope="col" key={key} colSpan={1}>
        {content}
      </th>
    );
  }

  render() {
    const propLabels = this.props.scope.labels || [];
    const labelColumns = propLabels
      .map((label) => {
        const column = {
          key: label.content.toLowerCase(),
        };

        if (label.showToggleSystemIndicesComponent) {
          // override text label content with a JSX component
          column.content = (
            <IndexLabel
              scope={this.props.scope}
              toggleShowSystemIndices={this.props.toggleShowSystemIndices}
            />
          );
        } else {
          column.content = label.content;
        }

        return column;
      })
      .map(this.createColumn);

    return (
      <thead>
        <tr>{labelColumns}</tr>
      </thead>
    );
  }
}
