/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AssignmentOptions } from './assignment_options';
import { PrimaryOptions } from './primary_options';
import { ControlDefinitions } from './table_type_configs';

interface ControlBarProps {
  assignmentOptions: any[] | null;
  assignmentTitle: string | null;
  renderAssignmentOptions?: (item: any, key: string) => any;

  showAssignmentOptions: boolean;
  controlDefinitions: ControlDefinitions;
  selectionCount: number;
  actionHandler(actionType: string, payload?: any): void;
}

export function ControlBar(props: ControlBarProps) {
  const {
    actionHandler,
    assignmentOptions,
    renderAssignmentOptions,
    assignmentTitle,
    controlDefinitions,
    selectionCount,
    showAssignmentOptions,
  } = props;

  const filters = controlDefinitions.filters.length === 0 ? null : controlDefinitions.filters;
  return selectionCount !== 0 && showAssignmentOptions ? (
    <AssignmentOptions
      actionHandler={actionHandler}
      assignmentOptions={assignmentOptions}
      renderAssignmentOptions={renderAssignmentOptions}
      assignmentTitle={assignmentTitle}
      controlDefinitions={controlDefinitions}
      selectionCount={selectionCount}
    />
  ) : (
    <PrimaryOptions
      actionHandler={actionHandler}
      filters={filters}
      onSearchQueryChange={(query: any) => actionHandler('search', query)}
      primaryActions={controlDefinitions.primaryActions || []}
    />
  );
}
