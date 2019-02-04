/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';
import {
  EuiSelect,
  EuiFormRow,
} from '@elastic/eui';

import { getEmsTMSServices } from '../../../../meta';


export class EMSTMSCreateSourceEditor extends React.Component {


  state = {
    emsTmsOptionsRaw: null
  };

  _loadTmsOptions = async () => {
    const options = await getEmsTMSServices();
    if (this._isMounted) {
      this.setState({
        emsTmsOptionsRaw: options
      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadTmsOptions();
  }

  render() {

    if (!this.state.emsTmsOptionsRaw) {
      return null;
    }

    const emsTileOptions = this.state.emsTmsOptionsRaw.map((service) => ({
      value: service.id,
      text: service.id //due to not having human readable names
    }));


    return (
      <EuiFormRow label="Tile service">
        <EuiSelect
          hasNoInitialSelection
          options={emsTileOptions}
          onChange={this.props.onChange}
        />
      </EuiFormRow>
    );
  }
}
