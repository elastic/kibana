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
        <EuiText grow={false}>
          <p>
            <FormattedMessage
              id="xpack.maps.joinDocs.intro"
              defaultMessage="A term join adds properties to vector features for data-driven styling."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.maps.joinDocs.intro"
              defaultMessage="A term join uses a shared key to combine vector features with the results of an Elasticsearch terms aggregation."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.maps.joinDocs.intro"
              defaultMessage="The terms aggregation creates a bucket for each unique shared key. Metrics are calculated for all documents in a bucket."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.maps.joinDocs.intro"
              defaultMessage="The join adds metrics for each terms aggregation bucket to the feature with the corresponding shared key. Features without a corresponding terms aggregation bucket are not visible on the map."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.maps.joinDocs.exmaple"
              defaultMessage="For example, you can use a term join to add web log traffic count to world countries, then shade the countries by web log traffic."
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
