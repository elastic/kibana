/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import classNames from 'classnames';
import { EuiText, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Map as MbMap, MapMouseEvent } from '@kbn/mapbox-gl';

interface Props {
  mbMap: MbMap;
}

interface State {
  show: boolean;
}

export class KeydownScrollZoom extends Component<Props, State> {
  private _isMounted = false;
  private _hideTimeout: ReturnType<typeof setTimeout> | undefined;

  state: State = {
    show: false,
  };

  componentDidMount() {
    this._isMounted = true;
    this.props.mbMap.on('wheel', this._onWheel);
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.props.mbMap.off('wheel', this._onWheel);
  }

  _onWheel = (event: MapMouseEvent) => {
    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
      this._hideTimeout = undefined;
    }

    if (event.originalEvent.shiftKey) {
      this.setState({ show: false });
      return;
    }

    this.setState({ show: true });
    this._hideTimeout = setTimeout(() => {
      if (this._isMounted) {
        this.setState({ show: false });
      }
    }, 500);
    event.preventDefault();
  };

  render() {
    return (
      <div
        className={classNames('mapKeydownScrollZoom', {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          mapKeydownScrollZoom__show: this.state.show,
        })}
      >
        <EuiText textAlign="center">
          <h2>
            <EuiTextColor color="ghost">
              {i18n.translate('xpack.maps.keydownScrollZoom.keydownToZoomInstructions', {
                defaultMessage: 'Use shift + scroll to zoom the map',
              })}
            </EuiTextColor>
          </h2>
          <h2>
            <EuiTextColor color="ghost">
              {i18n.translate('xpack.maps.keydownScrollZoom.keydownClickAndDragZoomInstructions', {
                defaultMessage:
                  'Use shift + click and drag to zoom the map to fit within a bounding box',
              })}
            </EuiTextColor>
          </h2>
        </EuiText>
      </div>
    );
  }
}
