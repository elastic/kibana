/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingContent } from '@elastic/eui';
import { lazyLoadModules } from '../lazy_load_bundle';
import { IndexNameFormProps } from '..';

interface State {
  IndexNameForm: React.ComponentType<IndexNameFormProps> | null;
}

export class IndexNameFormAsyncWrapper extends React.Component<IndexNameFormProps, State> {
  state: State = {
    IndexNameForm: null,
  };

  private _isMounted = false;

  componentWillUnmount(): void {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    lazyLoadModules().then((modules) => {
      if (this._isMounted) {
        this.setState({
          IndexNameForm: modules.IndexNameForm,
        });
      }
    });
  }

  render() {
    const { IndexNameForm } = this.state;
    return IndexNameForm ? <IndexNameForm {...this.props} /> : <EuiLoadingContent lines={3} />;
  }
}
