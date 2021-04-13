/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonIcon, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ILayer } from '../../../classes/layers/layer';

export interface Props {
  layerList: ILayer[];
  fitToBounds: () => void;
}

interface State {
  canFit: boolean;
}

export class FitToData extends React.Component<Props, State> {
  _isMounted: boolean = false;

  state = { canFit: false };

  componentDidMount(): void {
    this._isMounted = true;
    this._loadCanFit();
  }

  componentWillUnmount(): void {
    this._isMounted = false;
  }

  componentDidUpdate(): void {
    this._loadCanFit();
  }

  async _loadCanFit() {
    const promises = this.props.layerList.map(async (layer) => {
      return await layer.isFittable();
    });
    const canFit = (await Promise.all(promises)).some((isFittable) => isFittable);
    if (this._isMounted && this.state.canFit !== canFit) {
      this.setState({
        canFit,
      });
    }
  }

  render() {
    if (!this.state.canFit) {
      return null;
    }

    return (
      <EuiPanel paddingSize="none" className="mapToolbarOverlay__button">
        <EuiButtonIcon
          size="s"
          onClick={this.props.fitToBounds}
          data-test-subj="fitToData"
          iconType="expand"
          color="text"
          aria-label={i18n.translate('xpack.maps.fitToData.fitButtonLabel', {
            defaultMessage: 'Fit to data bounds',
          })}
          title={i18n.translate('xpack.maps.fitToData.fitAriaLabel', {
            defaultMessage: 'Fit to data bounds',
          })}
        />
      </EuiPanel>
    );
  }
}
