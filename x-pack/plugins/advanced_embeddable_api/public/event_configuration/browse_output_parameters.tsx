/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import {
  Embeddable,
  embeddableFactories,
  Trigger,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';

interface Props {
  embeddable?: Embeddable;
  onAdd: (path: string) => void;
  trigger?: Trigger;
  factoryName: string;
}

interface State {
  factoryName: string;
  pageIndex: number;
}

export class BrowseOutputParameters extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      factoryName: props.embeddable
        ? props.embeddable.type
        : Object.values(embeddableFactories.getFactories())[0].name,
      pageIndex: 0,
    };
  }

  public render() {
    return <div>{this.renderOutputParameters()}</div>;
  }

  private onTableChange = ({ page = {} }) => {
    const { index: pageIndex, size: pageSize } = page;

    this.setState({
      pageIndex,
    });
  };

  private renderOutputParameters() {
    const factory = embeddableFactories.getFactoryByName(this.props.factoryName);
    const columns = [
      {
        field: 'accessPath',
        sortable: false,
        name: 'Access path',
        render: (path: string) => (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButtonIcon iconType="plusInCircle" onClick={() => this.props.onAdd(path)} />
              <pre>{path}</pre>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'description',
        sortable: false,
        name: 'Description',
      },
    ];

    if (this.props.embeddable) {
      columns.push({
        field: 'value',
        sortable: false,
        name: 'Current value',
      });
    }

    const rows = Object.values(
      this.props.embeddable
        ? this.props.embeddable.getOutputSpec(this.props.trigger)
        : factory.getOutputSpec()
    );
    const { pageIndex } = this.state;
    const PAGE_SIZE = 5;
    const pagination = {
      pageIndex,
      pageSize: PAGE_SIZE,
      totalItemCount: rows.length,
      hidePerPageOptions: true,
    };

    const items = rows.splice(PAGE_SIZE * pageIndex, PAGE_SIZE);
    return (
      <EuiBasicTable
        columns={columns}
        items={items}
        sorting={{}}
        pagination={pagination}
        onChange={this.onTableChange}
      />
    );
  }
}
