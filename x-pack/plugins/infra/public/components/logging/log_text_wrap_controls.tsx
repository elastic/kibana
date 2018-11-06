/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import * as React from 'react';

interface LogTextWrapControlsProps {
  wrap: boolean;
  setTextWrap: (scale: boolean) => any;
  intl: InjectedIntl;
}

class LogTextWrapControlsUI extends React.PureComponent<LogTextWrapControlsProps> {
  public toggleWrap = () => {
    this.props.setTextWrap(!this.props.wrap);
  };

  public render() {
    const { wrap, intl } = this.props;

    return (
      <EuiFormRow
        label={intl.formatMessage({
          id: 'xpack.infra.logTextWrapControls.lineWrappingFormRowLabel',
          defaultMessage: 'Line Wrapping',
        })}
      >
        <EuiSwitch
          label={intl.formatMessage({
            id: 'xpack.infra.logTextWrapControls.wrapLongLinesFormRowLabel',
            defaultMessage: 'Wrap long lines',
          })}
          checked={wrap}
          onChange={this.toggleWrap}
        />
      </EuiFormRow>
    );
  }
}

export const LogTextWrapControls = injectI18n(LogTextWrapControlsUI);
