/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';

import {
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
    } = this.props;

    const {
      flushWidth,
      showBorder,
    } = this.state;

    return (
      <Fragment>
        <EuiListGroup flush={flushWidth} bordered={showBorder}>
          {list.map((l) => (
            <EuiListGroupItem
              key={l}
              id={`walterra-item-${l}`}
              label={l}
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
