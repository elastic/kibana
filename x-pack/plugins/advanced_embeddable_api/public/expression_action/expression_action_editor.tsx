/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { EuiFormRow, EuiTextArea } from '@elastic/eui';
import React, { Component } from 'react';
import { ExpressionAction } from './expression_action';

interface ExpressionActionEditorProps {
  config: string;
  onChange: (config: string) => void;
}

export class ExpressionActionEditor extends Component<ExpressionActionEditorProps> {
  constructor(props: ExpressionActionEditorProps) {
    super(props);
  }

  public onChange = (e: any) => {
    this.props.onChange(e.target.value);
  };

  public render() {
    return (
      <EuiFormRow label="Expression">
        <EuiTextArea
          aria-label="Use aria labels when no actual label is in use"
          value={this.props.config}
          onChange={this.onChange}
        />
      </EuiFormRow>
    );
  }
}
