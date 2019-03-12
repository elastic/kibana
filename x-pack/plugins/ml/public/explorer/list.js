/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiListGroup,
  EuiListGroupItem,
} from '@elastic/eui';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      flushWidth: false,
      showBorder: false,
    };
  }

  render() {
    const {
      list,
      optionsData,
    } = this.props;

    const {
      flushWidth,
      showBorder,
    } = this.state;


    return (
      <Fragment>
        <EuiListGroup flush={flushWidth} bordered={showBorder} style={{ maxWidth: '640px', padding: 0 }}>
          {list.map((l) => (
            <EuiListGroupItem
              key={l}
              id={`walterra-item-${l}`}
              label={(
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFormRow label="Custom name">
                      <EuiFieldText defaultValue={optionsData[l].formRowLabel}/>
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow label="Aggregation">
                      <EuiFieldText defaultValue={optionsData[l].agg}/>
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow label="Field">
                      <EuiFieldText defaultValue={optionsData[l].field} />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
              isActive
              extraAction={{
                color: 'subdued',
                onClick: () => this.props.deleteHandler(l),
                iconType: 'cross',
                iconSize: 's',
                'aria-label': l,
                alwaysShow: false,
              }}
            />
          ))}
        </EuiListGroup>
      </Fragment>
    );
  }
}
