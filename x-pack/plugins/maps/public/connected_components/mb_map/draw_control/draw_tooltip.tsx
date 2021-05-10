/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component, RefObject } from 'react';
import { EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Map as MbMap } from 'mapbox-gl';
import { DRAW_TYPE } from '../../../../common/constants';

const noop = () => {};

interface Props {
  mbMap: MbMap;
  drawType: DRAW_TYPE;
  indexPatternId: string | undefined;
  geoField: string | undefined;
}

interface State {
  x?: number;
  y?: number;
  isOpen: boolean;
}

export class DrawTooltip extends Component<Props, State> {
  private readonly _popoverRef: RefObject<EuiPopover> = React.createRef();
  private _isMounted = false;

  state: State = {
    x: undefined,
    y: undefined,
    isOpen: false,
  };

  componentDidMount() {
    this._isMounted = true;
    this.props.mbMap.on('mousemove', this._updateTooltipLocation);
    this.props.mbMap.on('mouseout', this._hideTooltip);
  }

  componentDidUpdate() {
    if (this._popoverRef.current) {
      this._popoverRef.current.positionPopoverFluid();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.props.mbMap.off('mousemove', this._updateTooltipLocation);
    this.props.mbMap.off('mouseout', this._hideTooltip);
    this._updateTooltipLocation.cancel();
  }

  _hideTooltip = () => {
    this._updateTooltipLocation.cancel();
    this.setState({ isOpen: false });
  };

  _updateTooltipLocation = _.throttle(({ lngLat }) => {
    const mouseLocation = this.props.mbMap.project(lngLat);
    if (!this._isMounted) {
      return;
    }
    this.setState({
      isOpen: true,
      x: mouseLocation.x,
      y: mouseLocation.y,
    });
  }, 100);

  render() {
    if (this.state.x === undefined || this.state.y === undefined) {
      return null;
    }

    let instructions;
    if (this.props.drawType === DRAW_TYPE.BOUNDS) {
      instructions = i18n.translate('xpack.maps.drawTooltip.boundsInstructions', {
        defaultMessage:
          'Click to start rectangle. Move mouse to adjust rectangle size. Click again to finish.',
      });
    } else if (this.props.drawType === DRAW_TYPE.DISTANCE) {
      instructions = i18n.translate('xpack.maps.drawTooltip.distanceInstructions', {
        defaultMessage: 'Click to set point. Move mouse to adjust distance. Click to finish.',
      });
    } else if (this.props.drawType === DRAW_TYPE.POLYGON) {
      instructions = i18n.translate('xpack.maps.drawTooltip.polygonInstructions', {
        defaultMessage: 'Click to start shape. Click to add vertex. Double click to finish.',
      });
    } else if (this.props.drawType === DRAW_TYPE.LINE) {
      instructions = i18n.translate('xpack.maps.drawTooltip.polygonInstructions', {
        defaultMessage: 'Click to start line. Click to add vertex. Double click to finish.',
      });
    } else if (this.props.drawType === DRAW_TYPE.POINT) {
      instructions = i18n.translate('xpack.maps.drawTooltip.polygonInstructions', {
        defaultMessage: 'Click to create point.',
      });
    } else {
      // unknown draw type, tooltip not needed
      return null;
    }

    const tooltipAnchor = (
      <div style={{ height: '26px', width: '26px', background: 'transparent' }} />
    );

    const title =
      this.props.indexPatternId && this.props.geoField ? (
        <EuiPopoverTitle paddingSize="s">
          {`${this.props.indexPatternId}: ${this.props.geoField}`}
        </EuiPopoverTitle>
      ) : undefined;

    return (
      <EuiPopover
        panelPaddingSize="s"
        id="drawInstructionsTooltip"
        button={tooltipAnchor}
        anchorPosition="rightCenter"
        isOpen={this.state.isOpen}
        closePopover={noop}
        ref={this._popoverRef}
        style={{
          pointerEvents: 'none',
          transform: `translate(${this.state.x - 13}px, ${this.state.y - 13}px)`,
        }}
      >
        {title ? title : null}
        <EuiText color="subdued" size="xs">
          {instructions}
        </EuiText>
      </EuiPopover>
    );
  }
}
