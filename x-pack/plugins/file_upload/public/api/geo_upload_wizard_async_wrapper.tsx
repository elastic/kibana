/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingContent } from '@elastic/eui';
import { FileUploadComponentProps, lazyLoadModules } from '../lazy_load_bundle';

interface State {
  GeoUploadWizard: React.ComponentType<FileUploadComponentProps> | null;
}

export class GeoUploadWizardAsyncWrapper extends React.Component<FileUploadComponentProps, State> {
  state: State = {
    GeoUploadWizard: null,
  };
  private _isMounted = false;

  componentDidMount() {
    this._isMounted = true;
    lazyLoadModules().then((modules) => {
      if (this._isMounted) {
        this.setState({
          GeoUploadWizard: modules.GeoUploadWizard,
        });
      }
    });
  }

  componentWillUnmount(): void {
    this._isMounted = false;
  }

  render() {
    const { GeoUploadWizard } = this.state;
    return GeoUploadWizard ? <GeoUploadWizard {...this.props} /> : <EuiLoadingContent lines={3} />;
  }
}
