/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import React, { PureComponent } from 'react';

import { BrowserFields } from '../../../containers/source';

import { OnDataProviderEdited } from '../events';
import { ProviderBadge } from './provider_badge';
import { ProviderItemActions } from './provider_item_actions';
import { QueryOperator } from './data_provider';
import { TimelineContext } from '../timeline_context';

interface ProviderItemBadgeProps {
  andProviderId?: string;
  browserFields?: BrowserFields;
  deleteProvider: () => void;
  field: string;
  kqlQuery: string;
  isEnabled: boolean;
  isExcluded: boolean;
  onDataProviderEdited?: OnDataProviderEdited;
  operator: QueryOperator;
  providerId: string;
  timelineId?: string;
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
    const {
      andProviderId,
      browserFields,
      deleteProvider,
      field,
      kqlQuery,
      isEnabled,
      isExcluded,
      onDataProviderEdited,
      operator,
      providerId,
      timelineId,
      val,
    } = this.props;

    return (
      <TimelineContext.Consumer>
        {({ isLoading }) => (
          <ProviderItemActions
            andProviderId={andProviderId}
            browserFields={browserFields}
            button={
              <ProviderBadge
                deleteProvider={!isLoading ? deleteProvider : noop}
                field={field}
                kqlQuery={kqlQuery}
                isEnabled={isEnabled}
                isExcluded={isExcluded}
                providerId={providerId}
                togglePopover={this.togglePopover}
                val={val}
                operator={operator}
              />
            }
            closePopover={this.closePopover}
            deleteProvider={deleteProvider}
            field={field}
            kqlQuery={kqlQuery}
            isEnabled={isEnabled}
            isExcluded={isExcluded}
            isLoading={isLoading}
            isOpen={this.state.isPopoverOpen}
            onDataProviderEdited={onDataProviderEdited}
            operator={operator}
            providerId={providerId}
            timelineId={timelineId}
            toggleEnabledProvider={this.toggleEnabledProvider}
            toggleExcludedProvider={this.toggleExcludedProvider}
            value={val}
          />
        )}
      </TimelineContext.Consumer>
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
