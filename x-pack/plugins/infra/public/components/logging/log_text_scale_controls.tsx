/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import * as React from 'react';

import { getLabelOfTextScale, isTextScale, TextScale } from '../../../common/log_text_scale';

interface LogTextScaleControlsProps {
  availableTextScales: TextScale[];
  textScale: TextScale;
  setTextScale: (scale: TextScale) => any;
  intl: InjectedIntl;
}

class LogTextScaleControlsUI extends React.PureComponent<LogTextScaleControlsProps> {
  public setTextScale = (textScale: string) => {
    if (isTextScale(textScale)) {
      this.props.setTextScale(textScale);
    }
  };

  public render() {
    const { availableTextScales, textScale, intl } = this.props;

    return (
      <EuiFormRow
        label={intl.formatMessage({
          id: 'xpack.infra.logTextScaleControls.textSizeFormRowLabel',
          defaultMessage: 'Text Size',
        })}
      >
        <EuiRadioGroup
          options={availableTextScales.map((availableTextScale: TextScale) => ({
            id: availableTextScale.toString(),
            label: getLabelOfTextScale(availableTextScale),
          }))}
          idSelected={textScale}
          onChange={this.setTextScale}
        />
      </EuiFormRow>
    );
  }
}

export const LogTextScaleControls = injectI18n(LogTextScaleControlsUI);
