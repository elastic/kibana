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

import { getEmsFiles } from '../../../../meta';


export class EMSFileCreateSourceEditor extends React.Component {


  state = {
    emsFileOptionsRaw: null
  };

  _loadFileOptions = async () => {
    const options = await getEmsFiles();
    if (this._isMounted) {
      this.setState({
        emsFileOptionsRaw: options
      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadFileOptions();
  }

  render() {

    if (!this.state.emsFileOptionsRaw) {
      return null;
    }

    const emsVectorOptions = this.state.emsFileOptionsRaw ? this.state.emsFileOptionsRaw.map((file) => ({
      value: file.id,
      text: file.name
    })) : [];


    return (
      <EuiFormRow label="Layer">
        <EuiSelect
          hasNoInitialSelection
          options={emsVectorOptions}
          onChange={this.props.onChange}
        />
      </EuiFormRow>
    );
  }
}
