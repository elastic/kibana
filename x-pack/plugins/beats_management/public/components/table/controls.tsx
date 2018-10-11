/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { AutocompleteField } from '../autocomplete_field/index';
import { OptionControl } from '../table_controls';
import { AssignmentOptions as AssignmentOptionsType } from './table';

interface ControlBarProps {
  assignmentOptions: AssignmentOptionsType;
  selectionCount: number;
  isLoadingSuggestions: any;
  onKueryBarSubmit: any;
  kueryValue: any;
  isKueryValid: any;
  onKueryBarChange: any;
  loadSuggestions: any;
  suggestions: any;
  filterQueryDraft: any;
}

export function ControlBar(props: ControlBarProps) {
  const {
    assignmentOptions: { actionHandler, items, schema, type },
    selectionCount,
    isLoadingSuggestions,
    isKueryValid,
    kueryValue,
    loadSuggestions,
    onKueryBarChange,
    onKueryBarSubmit,
    suggestions,
    filterQueryDraft,
  } = props;

  if (type === 'none') {
    return null;
  }

  const showSearch = type !== 'assignment' || selectionCount === 0;
  const showAssignmentOptions = type === 'assignment' && selectionCount > 0;
  const showPrimaryOptions = type === 'primary' && selectionCount > 0;

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
      {showPrimaryOptions &&
        schema.map(def => (
          <EuiFlexItem key={def.name} grow={def.grow}>
            <OptionControl
              schema={def}
              selectionCount={selectionCount}
              actionHandler={actionHandler}
              items={items}
            />
          </EuiFlexItem>
        ))}
      {showSearch && (
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
      )}
      {showAssignmentOptions &&
        schema.map(def => (
          <EuiFlexItem key={def.name} grow={def.grow}>
            <OptionControl
              schema={def}
              selectionCount={selectionCount}
              actionHandler={actionHandler}
              items={items}
            />
          </EuiFlexItem>
        ))}
    </EuiFlexGroup>
  );
}
