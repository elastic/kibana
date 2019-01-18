/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';

import {
  OnChangeDataProviderKqlQuery,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';
import { QueryDate } from './data_provider';
import { ProviderBadge } from './provider_badge';
import { ProviderItemActions } from './provider_item_actions';

interface ProviderItemBadgeProps {
  field: string;
  kqlQuery: string;
  isDisabled: boolean;
  isExcluded: boolean;
  onChangeDataProviderKqlQuery?: OnChangeDataProviderKqlQuery;
  onDataProviderRemoved?: OnDataProviderRemoved;
  onToggleDataProviderEnabled?: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded?: OnToggleDataProviderExcluded;
  providerId: string;
  queryDate?: QueryDate;
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
    const { field, kqlQuery, isDisabled, isExcluded, queryDate, providerId, val } = this.props;

    const badge = (
      <ProviderBadge
        deleteFilter={this.deleteFilter}
        field={field}
        kqlQuery={kqlQuery}
        isDisabled={isDisabled}
        isExcluded={isExcluded}
        providerId={providerId}
        queryDate={queryDate}
        togglePopover={this.togglePopover}
        val={val}
      />
    );

    return (
      <ProviderItemActions
        button={badge}
        closePopover={this.closePopover}
        field={field}
        kqlQuery={kqlQuery}
        isDisabled={isDisabled}
        isExcluded={isExcluded}
        isOpen={this.state.isPopoverOpen}
        providerId={providerId}
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

  private deleteFilter: React.MouseEventHandler<HTMLButtonElement> = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    // Make sure it doesn't also trigger the onclick for the whole badge
    if (event.stopPropagation) {
      event.stopPropagation();
    }
    const { onDataProviderRemoved } = this.props;
    onDataProviderRemoved!(this.props.providerId);
  };
}
