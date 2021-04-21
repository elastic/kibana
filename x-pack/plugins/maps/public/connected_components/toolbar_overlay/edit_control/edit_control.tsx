/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButton,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
// @ts-expect-error
import { GeometryFilterForm } from '../../../components/geometry_filter_form';
import { GeoFieldWithIndex } from '../../../components/geo_field_with_index';
// @ts-expect-error
import { IndexGeometrySelectPopoverForm } from '../../../components/index_geometry_select_popover_form';

export interface Props {
  geoFields: GeoFieldWithIndex[];
  activateDrawPointsMode: () => void;
  activateDrawShapesMode: () => void;
  deactivateDrawMode: () => void;
  featureModeActive: boolean;
}

interface State {
  isPopoverOpen: boolean;
}

export class EditControl extends Component<Props, State> {
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

  componentDidUpdate() {
    if (this.props.featureModeActive && this.state.isPopoverOpen) {
      this._closePopover();
    }
  }

  _renderEditButton() {
    return (
      <EuiPanel paddingSize="none">
        <EuiButtonIcon
          size="s"
          className="mapToolbarOverlay__button"
          color="text"
          iconType="pencil"
          onClick={this._togglePopover}
          aria-label={i18n.translate('xpack.maps.toolbarOverlay.editControlTitle', {
            defaultMessage: 'Add features to existing layer',
          })}
          title={i18n.translate('xpack.maps.toolbarOverlay.editControlTitle', {
            defaultMessage: 'Add features to existing layer',
          })}
        />
      </EuiPanel>
    );
  }

  render() {
    const editPopoverButton = (
      <EuiPopover
        id="editControlPopover"
        button={this._renderEditButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        panelPaddingSize="none"
        anchorPosition="leftUp"
      >
        <IndexGeometrySelectPopoverForm
          className="mapDrawControl__geometryFilterForm"
          geoFields={this.props.geoFields}
          onSubmit={({ geoFieldType }: { geoFieldType: string }) => {
            if (geoFieldType === 'geo_point') {
              this.props.activateDrawPointsMode();
            } else {
              this.props.activateDrawShapesMode();
            }
          }}
        />
      </EuiPopover>
    );

    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>{editPopoverButton}</EuiFlexItem>
        {this.props.featureModeActive ? (
          <EuiFlexItem>
            <EuiButton size="s" fill onClick={this.props.deactivateDrawMode}>
              <FormattedMessage
                id="xpack.maps.tooltip.editControl.cancelDrawButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  }
}
