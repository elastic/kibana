/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ILayer } from '../../../classes/layers/layer';

interface Props {
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

  componentDidUpdate(prevProps: Readonly<State>, prevState: Readonly<Props>, snapshot?: any): void {
    this._loadCanFit();
  }

  async _loadCanFit() {
    const fittableLayersPromise = this.props.layerList.map((layer) => layer.isFittable());
    const isFittables = (await Promise.all(fittableLayersPromise)).filter((l) => l === true);

    const canFit = !!isFittables.length;
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
      <EuiButtonIcon
        className="mapToolbarOverlay__button"
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
    );
  }
}
