/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiButtonIcon, EuiLink, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getDocLinks } from '../../../../kibana_services';

interface State {
  isPopoverOpen: boolean;
}

export class JoinDocumentationPopover extends Component<{}, State> {
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
        <EuiText style={{ maxWidth: '36em' }}>
          <p>
            <FormattedMessage
              id="xpack.maps.joinDocs.intro"
              defaultMessage="Term joins augment layers with properties for data driven styling. Term joins work as follows:"
            />
          </p>
          <ul>
            <li>
              <FormattedMessage
                id="xpack.maps.joinDocs.sharedKey"
                defaultMessage="A shared key combines vector features, the left source, with the results of an Elasticsearch aggregation, the right source."
              />
            </li>
            <li>
              <FormattedMessage
                id="xpack.maps.joinDocs.termsAggregation"
                defaultMessage="The terms aggregation creates a bucket for each unique shared key."
              />
            </li>
            <li>
              <FormattedMessage
                id="xpack.maps.joinDocs.metrics"
                defaultMessage="Metrics are calculated for all documents in a bucket."
              />
            </li>
            <li>
              <FormattedMessage
                id="xpack.maps.joinDocs.join"
                defaultMessage="The join adds metrics for each terms aggregation bucket with the corresponding shared key."
              />
            </li>
          </ul>
          <p>
            <FormattedMessage
              id="xpack.maps.joinDocs.noMatches"
              defaultMessage="Features that do have have a corresponding terms aggregation bucket are not visible on the map."
            />
          </p>
          <EuiLink href={getDocLinks().links.maps.termJoinsExample} target="_blank" external={true}>
            <FormattedMessage
              id="xpack.maps.joinDocs.linkLabel"
              defaultMessage="Term join example"
            />
          </EuiLink>
        </EuiText>
      </div>
    );
  }

  render() {
    return (
      <EuiPopover
        id="joinHelpPopover"
        anchorPosition="leftCenter"
        button={
          <EuiButtonIcon
            onClick={this._togglePopover}
            iconType="documentation"
            aria-label="Join documentation"
          />
        }
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        repositionOnScroll
        ownFocus
      >
        <EuiPopoverTitle>
          <FormattedMessage
            id="xpack.maps.layerPanel.joinEditor.termJoinsTitle"
            defaultMessage="Term joins"
          />
        </EuiPopoverTitle>
        {this._renderContent()}
      </EuiPopover>
    );
  }
}
