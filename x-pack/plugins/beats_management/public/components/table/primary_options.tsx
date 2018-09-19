/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
// @ts-ignore
import { AutocompleteSuggestion } from 'ui/autocomplete_providers';
import { AutocompleteField } from '../autocomplete_field/index';
import { ActionDefinition, FilterDefinition } from '../table';
import { ActionButton } from './action_button';

interface PrimaryOptionsProps {
  filters: FilterDefinition[] | null;
  primaryActions: ActionDefinition[];
  isLoadingSuggestions: boolean;
  loadSuggestions: () => any;
  suggestions: AutocompleteSuggestion[];
  onKueryBarSubmit: any;
  kueryValue: any;
  filterQueryDraft: any;
  isKueryValid: any;
  onKueryBarChange: any;
  actionHandler(actionType: string, payload?: any): void;
  onSearchQueryChange(query: any): void;
}

interface PrimaryOptionsState {
  isPopoverVisible: boolean;
}

export class PrimaryOptions extends React.PureComponent<PrimaryOptionsProps, PrimaryOptionsState> {
  constructor(props: PrimaryOptionsProps) {
    super(props);

    this.state = {
      isPopoverVisible: false,
    };
  }
  public render() {
    // filterQueryDraft,

    const {
      actionHandler,
      primaryActions,
      isLoadingSuggestions,
      loadSuggestions,
      suggestions,
      onKueryBarSubmit,
      isKueryValid,
      kueryValue,
      onKueryBarChange,
    } = this.props;
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <ActionButton
            actionHandler={actionHandler}
            actions={primaryActions}
            isPopoverVisible={this.state.isPopoverVisible}
            hidePopover={this.hidePopover}
            showPopover={this.showPopover}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <AutocompleteField
            value={kueryValue}
            isLoadingSuggestions={isLoadingSuggestions}
            isValid={isKueryValid}
            loadSuggestions={loadSuggestions}
            onChange={onKueryBarChange}
            onSubmit={onKueryBarSubmit}
            placeholder="Filter results"
            suggestions={suggestions}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  private hidePopover = () => this.setState({ isPopoverVisible: false });
  private showPopover = () => this.setState({ isPopoverVisible: true });
}
