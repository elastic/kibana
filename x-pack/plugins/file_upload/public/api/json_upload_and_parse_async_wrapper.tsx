/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { FileUploadComponentProps, lazyLoadModules } from '../lazy_load_bundle';

interface State {
  JsonUploadAndParse: React.ComponentType<FileUploadComponentProps> | null;
}

export class JsonUploadAndParseAsyncWrapper extends React.Component<
  FileUploadComponentProps,
  State
> {
  state: State = {
    JsonUploadAndParse: null,
  };

  componentDidMount() {
    lazyLoadModules().then((modules) => {
      this.setState({
        JsonUploadAndParse: modules.JsonUploadAndParse,
      });
    });
  }

  render() {
    const { JsonUploadAndParse } = this.state;
    return JsonUploadAndParse ? <JsonUploadAndParse {...this.props} /> : <EuiLoadingSpinner />;
  }
}
