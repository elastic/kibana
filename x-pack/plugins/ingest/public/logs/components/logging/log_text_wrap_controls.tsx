/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import * as React from 'react';

interface LogTextWrapControlsProps {
  wrap: boolean;
  setTextWrap: (scale: boolean) => any;
}

export class LogTextWrapControls extends React.PureComponent<LogTextWrapControlsProps> {
  public toggleWrap = () => {
    this.props.setTextWrap(!this.props.wrap);
  };

  public render() {
    const { wrap } = this.props;

    return (
      <EuiFormRow label="Line Wrapping">
        <EuiSwitch label="Wrap long lines" checked={wrap} onChange={this.toggleWrap} />
      </EuiFormRow>
    );
  }
}
