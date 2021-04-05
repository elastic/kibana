/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DRAW_TYPE } from '../../../../common/constants';
// @ts-expect-error
import { GeometryFilterForm } from '../../../components/geometry_filter_form';

export interface Props {
  cancelDraw: () => void;
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
          defaultMessage: 'Add feature',
        })}
        title={i18n.translate('xpack.maps.toolbarOverlay.featureEditTitle', {
          defaultMessage: 'Add feature',
        })}
      />
    );
  }

  render() {
    return (
      <EuiPanel paddingSize="none" style={{ display: 'inline-block' }}>
        <EuiFlexGroup responsive={false} gutterSize="none" direction="column">
          <EuiFlexItem key={'line'} grow={false}>
            <EuiButtonIcon
              className="mapToolbarOverlay__button"
              onClick={() => {
                console.log('line');
              }}
              iconType="minus"
              aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureEdit.drawLineLabel', {
                defaultMessage: 'Draw line',
              })}
              title={i18n.translate('xpack.maps.toolbarOverlay.featureEdit.drawLineTitle', {
                defaultMessage: 'Draw line',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem key={'polygon'} grow={false}>
            <EuiButtonIcon
              className="mapToolbarOverlay__button"
              onClick={() => {
                console.log('Polygon');
              }}
              iconType="home"
              aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureEdit.drawPolygonLabel', {
                defaultMessage: 'Draw polygon',
              })}
              title={i18n.translate('xpack.maps.toolbarOverlay.featureEdit.drawLineTitle', {
                defaultMessage: 'Draw polygon',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem key={'boundingBox'} grow={false}>
            <EuiButtonIcon
              className="mapToolbarOverlay__button"
              onClick={() => {
                console.log('Bounding box');
              }}
              iconType="stop"
              aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureEdit.drawBBoxLabel', {
                defaultMessage: 'Draw bounding box',
              })}
              title={i18n.translate('xpack.maps.toolbarOverlay.featureEdit.drawBBoxTitle', {
                defaultMessage: 'Draw bounding box',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem key={'point'} grow={false}>
            <EuiButtonIcon
              className="mapToolbarOverlay__button"
              onClick={() => {
                console.log('Point');
              }}
              iconType="visMapCoordinate"
              aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureEdit.drawPointLabel', {
                defaultMessage: 'Draw point',
              })}
              title={i18n.translate('xpack.maps.toolbarOverlay.featureEdit.drawPointTitle', {
                defaultMessage: 'Draw point',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
}
