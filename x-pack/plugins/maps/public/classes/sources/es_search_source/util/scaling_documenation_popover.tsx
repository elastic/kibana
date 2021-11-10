/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

const ADVANTAGE_TITLE = i18n.translate('xpack.maps.scalingDocs.advantagesTitle', {
  defaultMessage: 'Advantages',
});

const DISADVANTAGE_TITLE = i18n.translate('xpack.maps.scalingDocs.disadvantagesTitle', {
  defaultMessage: 'Disadvantages',
});

interface Props {
  limitOptionLabel: string;
  clustersOptionLabel: string;
  maxResultWindow: string;
  mvtOptionLabel: string;
}

interface State {
  isPopoverOpen: boolean;
}

export class ScalingDocumenationPopover extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  _renderContent() {
    return (
      <div>
        <EuiText grow={false}>
          <p>
            <FormattedMessage 
              id="xpack.maps.scalingDocs.intro" 
              defaultMessage="Select the appropriate option for your use case."
            />
          </p>
          <dl>
            <dt>{this.props.limitOptionLabel}</dt>
            <dd>
              <p>
                <FormattedMessage 
                  id="xpack.maps.scalingDocs.limitDetails" 
                  defaultMessage="Layer displays features from the first {maxResultWindow} documents. Results exceeding {maxResultWindow} are not displayed."
                  values={{ maxResultWindow: this.props.maxResultWindow }}
                />
              </p>
              <h6>{ADVANTAGE_TITLE}</h6>
              <ul>
                <li>
                  <FormattedMessage 
                    id="xpack.maps.scalingDocs.termJoins" 
                    defaultMessage="Supports term joins"
                  />
                </li>
                <li>
                  <FormattedMessage 
                    id="xpack.maps.scalingDocs.fieldFormatters" 
                    defaultMessage="Supports field formatters"
                  />
                </li>
              </ul>
              <h6>{DISADVANTAGE_TITLE}</h6>
              <ul>
                <li>
                  <FormattedMessage 
                    id="xpack.maps.scalingDocs.noLargeData" 
                    defaultMessage="Can not display large data sets"
                  />
                </li>
              </ul>
            </dd>
          
            <dt>{this.props.clustersOptionLabel}</dt>
            <dd>
              <p>
                <FormattedMessage 
                  id="xpack.maps.scalingDocs.clustersDetails" 
                  defaultMessage="When results exceed {maxResultWindow}, the layer uses GeoTile grid aggregation to group your documents into clusters and displays metrics for each cluster. When results are less then {maxResultWindow}, the layer displays features from individual documents."
                  values={{ maxResultWindow: this.props.maxResultWindow }}
                />
              </p>
              <h6>{ADVANTAGE_TITLE}</h6>
              <ul>
                <li>
                  <FormattedMessage 
                    id="xpack.maps.scalingDocs.largeDataSets" 
                    defaultMessage="Displays large data sets"
                  />
                </li>
                <li>
                  <FormattedMessage 
                    id="xpack.maps.scalingDocs.fieldFormatters" 
                    defaultMessage="Supports field formatters"
                  />
                </li>
              </ul>
              <h6>{DISADVANTAGE_TITLE}</h6>
              <ul>
                <li>
                  <FormattedMessage 
                    id="xpack.maps.scalingDocs.noTermJoins" 
                    defaultMessage="Does not support term joins"
                  />
                </li>
              </ul>
            </dd>
          
            <dt>{this.props.mvtOptionLabel}</dt>
            <dd>
              <p>
                <FormattedMessage 
                  id="xpack.maps.scalingDocs.mvtDetails" 
                  defaultMessage="Vector tiles partition your map into tiles. Each tile request is limited to the first {maxResultWindow} documents. When a tile exceeds {maxResultWindow}, results exceeding {maxResultWindow} are not contained in the tile and a dashed rectangle outlining the bounding box containing all geo values within the tile is displayed."
                  values={{ maxResultWindow: this.props.maxResultWindow }}
                />
              </p>
              <h6>{ADVANTAGE_TITLE}</h6>
              <ul>
                <li>
                  <FormattedMessage 
                    id="xpack.maps.scalingDocs.largeDataSets" 
                    defaultMessage="Displays large data sets"
                  />
                </li>
              </ul>
              <h6>{DISADVANTAGE_TITLE}</h6>
              <ul>
                <li>
                  <FormattedMessage 
                    id="xpack.maps.scalingDocs.noFieldFormatters" 
                    defaultMessage="Does not support field formatters"
                  />
                </li>
                <li>
                  <FormattedMessage 
                    id="xpack.maps.scalingDocs.noTermJoins" 
                    defaultMessage="Does not support term joins"
                  />
                </li>
              </ul>
            </dd>
          </dl>
        </EuiText>
      </div>
    );
  }

  render() {
    return (
      <EuiPopover
        id="scalingHelpPopover"
        anchorPosition="leftCenter"
        button={<EuiButtonIcon
          onClick={this._togglePopover}
          iconType="documentation"
          aria-label="Scaling documentation"
        />}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        repositionOnScroll
        ownFocus
      >
        {this._renderContent()}
      </EuiPopover>
    );
  }
}
