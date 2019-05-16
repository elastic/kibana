/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';

import { ProviderBadge } from './provider_badge';
import { ProviderItemActions } from './provider_item_actions';

interface ProviderItemBadgeProps {
  deleteProvider: () => void;
  field: string;
  kqlQuery: string;
  isEnabled: boolean;
  isExcluded: boolean;
  providerId: string;
  toggleEnabledProvider: () => void;
  toggleExcludedProvider: () => void;
  val: string | number;
}

interface OwnState {
  isPopoverOpen: boolean;
}

export class ProviderItemBadge extends PureComponent<ProviderItemBadgeProps, OwnState> {
  public readonly state = {
    isPopoverOpen: false,
  };

  public render() {
    const { deleteProvider, field, kqlQuery, isEnabled, isExcluded, providerId, val } = this.props;

    const badge = (
      <ProviderBadge
        deleteProvider={deleteProvider}
        field={field}
        kqlQuery={kqlQuery}
        isEnabled={isEnabled}
        isExcluded={isExcluded}
        providerId={providerId}
        togglePopover={this.togglePopover}
        val={val}
      />
    );

    return (
      <ProviderItemActions
        button={badge}
        closePopover={this.closePopover}
        deleteProvider={deleteProvider}
        field={field}
        kqlQuery={kqlQuery}
        isEnabled={isEnabled}
        isExcluded={isExcluded}
        isOpen={this.state.isPopoverOpen}
        providerId={providerId}
        toggleEnabledProvider={this.toggleEnabledProvider}
        toggleExcludedProvider={this.toggleExcludedProvider}
        value={val}
      />
    );
  }

  private togglePopover = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  private closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  private toggleEnabledProvider = () => {
    this.props.toggleEnabledProvider();
    this.closePopover();
  };

  private toggleExcludedProvider = () => {
    this.props.toggleExcludedProvider();
    this.closePopover();
  };
}
