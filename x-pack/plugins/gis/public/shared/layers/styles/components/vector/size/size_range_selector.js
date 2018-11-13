/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
// EuiFormRow,
// EuiFlexGroup,
// EuiFlexItem,
// EuiRange
} from '@elastic/eui';


export class SizeRangeSelector extends React.Component {

  constructor() {
    super();
  }

  _onMinSizeChange = () => {
    console.warn('must implement');
  };

  _onMaxSizeChange = () => {
    console.warn('must implement');
  };

  render() {


    return (<div>todo</div>);
    //
    // const minSize = (this.props.selectedOptions && typeof this.props.selectedOptions.minSize === 'number') ? this.props.selectedOptions.minSize : 0;
    // const maxSize = (this.props.selectedOptions && typeof this.props.selectedOptions.maxSize === 'number') ? this.props.selectedOptions.maxSize : 100;
    //
    // return (<EuiFormRow>
    //   <EuiFlexGroup>
    //     <EuiFlexItem>
    //       <EuiFormRow
    //         label="Min size"
    //         compressed
    //       >
    //         <EuiRange
    //           min={0}
    //           max={100}
    //           value={minSize.toString()}
    //           onChange={this._onMinZoomChange}
    //           showInput
    //         />
    //       </EuiFormRow>
    //     </EuiFlexItem>
    //     <EuiFlexItem>
    //       <EuiFormRow
    //         label="Max size"
    //         compressed
    //       >
    //         <EuiRange
    //           min={0}
    //           max={100}
    //           value={maxSize.toString()}
    //           onChange={this._onMaxZoomChange}
    //           showInput
    //         />
    //       </EuiFormRow>
    //     </EuiFlexItem>
    //   </EuiFlexGroup>
    // </EuiFormRow>);
  }

}
