/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import classNames from 'classnames';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Map as MbMap, MapMouseEvent } from '@kbn/mapbox-gl';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

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

    if ((isMac && event.originalEvent.metaKey) || (!isMac && event.originalEvent.ctrlKey)) {
      this.setState({ show: false });
      return;
    }

    this.setState({ show: true });
    this._hideTimeout = setTimeout(() => {
      if (this._isMounted) {
        this.setState({ show: false });
      }
    }, 1500);
    event.preventDefault();
  };

  render() {
    return (
      <aside
        className={classNames('mapKeydownScrollZoom', {
          'mapKeydownScrollZoom--show': this.state.show,
        })}
      >
        <EuiText textAlign="center" size="s" color="ghost">
          <h3>
            {i18n.translate('xpack.maps.keydownScrollZoom.keydownToZoomInstructions', {
              defaultMessage: 'Use {key} + scroll to zoom the map',
              values: { key: isMac ? '⌘' : 'control' },
            })}
          </h3>

          <p>
            {i18n.translate('xpack.maps.keydownScrollZoom.keydownClickAndDragZoomInstructions', {
              defaultMessage:
                'Use shift + click and drag to zoom the map to fit within a bounding box',
            })}
          </p>
        </EuiText>
      </aside>
    );
  }
}
