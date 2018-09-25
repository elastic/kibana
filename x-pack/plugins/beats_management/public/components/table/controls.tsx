/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  AssignmentOptionList,
  AssignmentOptionSearch,
  BaseAssignmentOptions,
} from './assignment_option_types';
import { AssignmentOptions } from './assignment_options';
import { PrimaryOptions } from './primary_options';
import { ControlDefinitions } from './table_type_configs';

interface ControlBarProps {
  assignmentOptions: AssignmentOptionList | AssignmentOptionSearch | BaseAssignmentOptions;
  controlDefinitions: ControlDefinitions;
  selectionCount: number;
}

export function ControlBar(props: ControlBarProps) {
  const {
    assignmentOptions,
    assignmentOptions: { actionHandler },
    controlDefinitions,
    controlDefinitions: { filters, primaryActions },
    selectionCount,
  } = props;

  return assignmentOptions.type === 'primary' ? (
    <PrimaryOptions
      actionHandler={actionHandler}
      filters={filters.length ? filters : null}
      onSearchQueryChange={(query: any) => actionHandler('search', query)}
      primaryActions={primaryActions || []}
    />
  ) : selectionCount !== 0 ? (
    <AssignmentOptions
      assignmentOptions={assignmentOptions}
      controlDefinitions={controlDefinitions}
      selectionCount={selectionCount}
    />
  ) : null;
}
