/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, Component } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { LayerSelector } from './layer_selector';
import { MlAnomalyLayersType } from './util';

interface Props {
  onChange: (...args: Array<{ propName: string; value: unknown }>) => void;
  typicalActual: MlAnomalyLayersType;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface State {}

export class UpdateAnomalySourceEditor extends Component<Props, State> {
  state: State = {};

  render() {
    return (
      <Fragment>
        <EuiPanel>
          <EuiTitle size="xs">
            <h6>
              <FormattedMessage id="xpack.ml.maps.settingsEditorLabel" defaultMessage="Anomalies" />
            </h6>
          </EuiTitle>
          <EuiSpacer size="s" />
          <LayerSelector
            onChange={(typicalActual: MlAnomalyLayersType) => {
              this.props.onChange({
                propName: 'typicalActual',
                value: typicalActual,
              });
            }}
            typicalActual={this.props.typicalActual}
          />
        </EuiPanel>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
}
