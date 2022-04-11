/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiButtonIcon, EuiLink, EuiPopover, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getDocLinks } from '../../../../kibana_services';

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
            <dt>{this.props.mvtOptionLabel} (Default)</dt>
            <dd>
              <p>
                <FormattedMessage
                  id="xpack.maps.scalingDocs.mvtDetails"
                  defaultMessage="Vector tiles partition your map into tiles, with each tile displaying features from the first {maxResultWindow} documents. Results exceeding {maxResultWindow} are not displayed in a tile. A bounding box indicates the area where data is incomplete."
                  values={{ maxResultWindow: this.props.maxResultWindow }}
                />
              </p>
              <p>
                <FormattedMessage
                  id="xpack.maps.scalingDocs.mvtUseCase"
                  defaultMessage="Use this option to display large data sets with the fastest loading times."
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
                  defaultMessage="Use this option when you can not use vector tiles for the following reasons:"
                />
                <ul>
                  <li>
                    <FormattedMessage
                      id="xpack.maps.scalingDocs.limitUseCase"
                      defaultMessage="Formatted labels"
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="xpack.maps.scalingDocs.limitUseCase"
                      defaultMessage="Multiple term joins"
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="xpack.maps.scalingDocs.limitUseCase"
                      defaultMessage="Data driven styling from term join metrics with 'Label', 'Label size', icon 'Symbol size', and 'Symbol orientation' style properties"
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="xpack.maps.scalingDocs.limitUseCase"
                      defaultMessage="Data driven styling from scripted fields"
                    />
                  </li>
                </ul>
              </p>
            </dd>
          </dl>

          <p style={{ fontStyle: 'italic' }}>
            <FormattedMessage
              id="xpack.maps.scalingDocs.maxResultWindow"
              defaultMessage="{maxResultWindow} constraint provided by {link} index setting."
              values={{
                maxResultWindow: this.props.maxResultWindow,
                link: (
                  <EuiLink
                    href={getDocLinks().links.elasticsearch.dynamicIndexSettings}
                    target="_blank"
                    external={true}
                  >
                    max_result_window
                  </EuiLink>
                ),
              }}
            />
          </p>
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
