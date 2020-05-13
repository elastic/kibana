/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component, Fragment } from 'react';
import { EuiSpacer, EuiCard, EuiIcon } from '@elastic/eui';
import { getLayerWizards, LayerWizard } from '../../../classes/layers/layer_wizard_registry';

interface Props {
  onSelect: (layerWizard: LayerWizard) => void;
}

interface State {
  layerWizards: LayerWizard[];
}

export class LayerWizardSelect extends Component<Props, State> {
  private _isMounted: boolean = false;

  state = {
    layerWizards: [],
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadLayerWizards();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadLayerWizards() {
    const layerWizards = await getLayerWizards();
    if (this._isMounted) {
      this.setState({ layerWizards });
    }
  }

  render() {
    return this.state.layerWizards.map((layerWizard: LayerWizard) => {
      const icon = layerWizard.icon ? <EuiIcon type={layerWizard.icon} size="l" /> : undefined;

      const onClick = () => {
        this.props.onSelect(layerWizard);
      };

      return (
        <Fragment key={layerWizard.title}>
          <EuiSpacer size="s" />
          <EuiCard
            className="mapLayerAddpanel__card"
            title={layerWizard.title}
            icon={icon}
            onClick={onClick}
            description={layerWizard.description}
            layout="horizontal"
            data-test-subj={_.camelCase(layerWizard.title)}
          />
        </Fragment>
      );
    });
  }
}
