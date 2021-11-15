/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiButtonIcon, EuiPopover, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

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
          <dl>
            <dt>{this.props.mvtOptionLabel}</dt>
            <dd>
              <p>
                <FormattedMessage
                  id="xpack.maps.scalingDocs.mvtDetails"
                  defaultMessage="Partition your map into tiles, with each tile displaying features from the first {maxResultWindow} documents. Results exceeding {maxResultWindow} are not displayed in a tile. A bounding box indicates the area where data is incomplete."
                  values={{ maxResultWindow: this.props.maxResultWindow }}
                />
              </p>
              <p>
                <FormattedMessage
                  id="xpack.maps.scalingDocs.mvtUseCase"
                  defaultMessage="Use this option to display large data sets with the fastest loading times. Does not support term joins, formatted labels, and data driven styling from scripted fields."
                />
              </p>
            </dd>

            <dt>{this.props.clustersOptionLabel}</dt>
            <dd>
              <p>
                <FormattedMessage
                  id="xpack.maps.scalingDocs.clustersDetails"
                  defaultMessage="Display clusters when results exceed {maxResultWindow} documents. Display documents when results are less then {maxResultWindow}."
                  values={{ maxResultWindow: this.props.maxResultWindow }}
                />
              </p>
              <p>
                <FormattedMessage
                  id="xpack.maps.scalingDocs.clustersUseCase"
                  defaultMessage="Use this option to display large data sets. Does not support term joins."
                />
              </p>
            </dd>

            <dt>{this.props.limitOptionLabel}</dt>
            <dd>
              <p>
                <FormattedMessage
                  id="xpack.maps.scalingDocs.limitDetails"
                  defaultMessage="Display features from the first {maxResultWindow} documents."
                  values={{ maxResultWindow: this.props.maxResultWindow }}
                />
              </p>
              <p>
                <FormattedMessage
                  id="xpack.maps.scalingDocs.limitUseCase"
                  defaultMessage="Use this option to create choropleth maps that compare statistics across boundaries."
                />
              </p>
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
        button={
          <EuiButtonIcon
            onClick={this._togglePopover}
            iconType="documentation"
            aria-label="Scaling documentation"
          />
        }
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
