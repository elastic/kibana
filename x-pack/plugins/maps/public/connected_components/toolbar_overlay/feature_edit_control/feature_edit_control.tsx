/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DRAW_TYPE } from '../../../../common/constants';
// @ts-expect-error
import { GeometryFilterForm } from '../../../components/geometry_filter_form';
import { GeoFieldWithIndex } from '../../../components/geo_field_with_index';

const DRAW_SHAPE = i18n.translate('xpack.maps.toolbarOverlay.drawShapeLabelShort', {
  defaultMessage: 'Draw shape',
});

const DRAW_BOUNDS = i18n.translate('xpack.maps.toolbarOverlay.drawBoundsLabelShort', {
  defaultMessage: 'Draw bounds',
});

const DRAW_DISTANCE = i18n.translate('xpack.maps.toolbarOverlay.drawDistanceLabel', {
  defaultMessage: 'Draw distance',
});

export interface Props {
  cancelDraw: () => void;
  geoFields: GeoFieldWithIndex[];
  initiateDraw: (drawFeatureState: DRAW_TYPE) => void;
}

interface State {
  isPopoverOpen: boolean;
}

export class FeatureEditControl extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState({ isPopoverOpen: false });
  };

  _renderFeatureEditButton() {
    return (
      <EuiButtonIcon
        className="mapToolbarOverlay__button"
        color="text"
        iconType="pencil"
        onClick={this._togglePopover}
        aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureEditTitle', {
          // This feature only "adds" at the moment. Messaging can be changed when further capabilities added
          defaultMessage: 'Add feature',
        })}
        title={i18n.translate('xpack.maps.toolbarOverlay.featureEditTitle', {
          defaultMessage: 'Add feature',
        })}
      />
    );
  }

  render() {
    const featureEditControlPopoverButton = (
      <EuiPopover
        id="FeatureEditControlPopover"
        button={this._renderFeatureEditButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        panelPaddingSize="none"
        anchorPosition="leftUp"
      >
        <EuiContextMenuPanel
          items={[
            <EuiContextMenuItem key="1" onClick={() => this.props.initiateDraw(DRAW_TYPE.POLYGON)}>
              Polygon
            </EuiContextMenuItem>,
            <EuiContextMenuItem key="2" onClick={() => this.props.initiateDraw(DRAW_TYPE.BOUNDS)}>
              Rectangle
            </EuiContextMenuItem>,
            <EuiContextMenuItem key="3" onClick={() => this.props.initiateDraw(DRAW_TYPE.DISTANCE)}>
              Polyline
            </EuiContextMenuItem>,
            <EuiContextMenuItem key="4" onClick={() => this.props.initiateDraw(DRAW_TYPE.POINT)}>
              Point
            </EuiContextMenuItem>,
          ]}
        />
      </EuiPopover>
    );

    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>{featureEditControlPopoverButton}</EuiFlexItem>
        {/* <EuiFlexItem>*/}
        {/*  <EuiButton size="s" fill onClick={this.props.cancelDraw}>*/}
        {/*    <FormattedMessage*/}
        {/*      id="xpack.maps.tooltip.FeatureEditControl.cancelDrawButtonLabel"*/}
        {/*      defaultMessage="Cancel"*/}
        {/*    />*/}
        {/*  </EuiButton>*/}
        {/* </EuiFlexItem>*/}
      </EuiFlexGroup>
    );
  }
}
