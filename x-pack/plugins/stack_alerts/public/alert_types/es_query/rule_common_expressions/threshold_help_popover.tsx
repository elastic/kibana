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
  EuiPopoverTitle,
  EuiText,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface State {
  isPopoverOpen: boolean;
}

export class QueryThresholdHelpPopover extends Component<{}, State> {
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
          <ol>
            <li>
              <FormattedMessage
                id="xpack.stackAlerts.esQuery.ui.thresholdHelp.threshold"
                defaultMessage="Specify a threshold value and a comparison operator. For example, is above 1000. Each time the rule runs, it checks whether the number of documents that match your query meets this threshold."
              />
            </li>
            <li>
              <FormattedMessage
                id="xpack.stackAlerts.esQuery.ui.thresholdHelp.timeWindow"
                defaultMessage="Specify how far back in time to search. 
                To avoid gaps in detection, generally this time window should be greater than the value you chose for the {checkField} field."
                values={{
                  checkField: <b>Check every</b>,
                }}
              />
            </li>
          </ol>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCallOut title="Multiple matches of the same document" iconType="pin">
          <p>
            <FormattedMessage
              id="xpack.stackAlerts.esQuery.ui.thresholdHelp.duplicateMatches"
              defaultMessage="This rule type checks for duplication of document matches across multiple runs. If you configure the rule with a time window greater than the check interval and a document matches the query in multiple runs, it is considered in only the first threshold calculation. The rule uses the timestamp of the matches to avoid alerting on the same match multiple times."
            />
          </p>
        </EuiCallOut>
      </div>
    );
  }

  render() {
    return (
      <EuiPopover
        id="thresholdHelpPopover"
        anchorPosition="leftCenter"
        button={
          <EuiButtonIcon
            onClick={this._togglePopover}
            iconType="documentation"
            aria-label={i18n.translate('xpack.stackAlerts.esQuery.ui.thresholdHelp.ariaLabel', {
              defaultMessage: 'Help',
            })}
          />
        }
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        repositionOnScroll
        ownFocus
      >
        <EuiPopoverTitle>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.thresholdHelp.title"
            defaultMessage="Set the threshold and time window"
          />
        </EuiPopoverTitle>
        {this._renderContent()}
      </EuiPopover>
    );
  }
}
