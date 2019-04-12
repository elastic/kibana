/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import React, { Component } from 'react';
import { NavigateAction } from './navigate_action';

interface NavigateActionEditorProps {
  config: string;
  onChange: (action: NavigateAction) => void;
}

export class NavigateActionEditor extends Component<NavigateActionEditorProps> {
  constructor(props: NavigateActionEditorProps) {
    super(props);
  }

  public render() {
    return (
      <EuiFormRow label="Url template" helpText="e.g. https://www.google.com/search?q=${QUERY}">
        <EuiFieldText name="url" onChange={this.setUrl} value={this.props.config} />
      </EuiFormRow>
    );
  }
  private setUrl = (e: any) => {
    this.props.onChange(e.target.value);
  };
}
