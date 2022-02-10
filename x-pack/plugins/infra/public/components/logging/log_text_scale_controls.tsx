/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as React from 'react';

import { isTextScale, TextScale } from '../../../common/log_text_scale';

interface LogTextScaleControlsProps {
  availableTextScales: TextScale[];
  textScale: TextScale;
  setTextScale: (scale: TextScale) => any;
}

export class LogTextScaleControls extends React.PureComponent<LogTextScaleControlsProps> {
  public setTextScale = (textScale: string) => {
    if (isTextScale(textScale)) {
      this.props.setTextScale(textScale);
    }
  };

  public render() {
    const { availableTextScales, textScale } = this.props;

    return (
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.infra.logs.customizeLogs.textSizeFormRowLabel"
            defaultMessage="Text Size"
          />
        }
      >
        <EuiRadioGroup
          options={availableTextScales.map((availableTextScale: TextScale) => ({
            id: availableTextScale.toString(),
            label: (
              <FormattedMessage
                id="xpack.infra.logs.customizeLogs.textSizeRadioGroup"
                defaultMessage="{textScale, select,
                  small {Small}
                  medium {Medium}
                  large {Large}
                  other {{textScale}}
                }"
                values={{
                  textScale: availableTextScale,
                }}
              />
            ),
          }))}
          idSelected={textScale}
          onChange={this.setTextScale}
        />
      </EuiFormRow>
    );
  }
}
