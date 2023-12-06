/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';

import { OWNER_INFO } from '../../../common/constants';
import * as i18n from './translations';
import type { Solution } from './types';
import { MultiSelectFilter, mapToMultiSelectOption } from './multi_select_filter';
import type { CasesOwners } from '../../client/helpers/can_use_cases';
import { useCasesContext } from '../cases_context/use_cases_context';

interface FilterPopoverProps {
  onChange: (params: { filterId: string; selectedOptionKeys: string[] }) => void;
  selectedOptionKeys: string[];
  availableSolutions: string[];
}

const isValidSolution = (solution: string): solution is CasesOwners =>
  Object.keys(OWNER_INFO).includes(solution);

const mapToReadableSolutionName = (solution: string): Solution => {
  if (isValidSolution(solution)) {
    return OWNER_INFO[solution];
  }

  return { id: solution, label: solution, iconType: '' };
};

export const SolutionFilterComponent = ({
  onChange,
  selectedOptionKeys,
  availableSolutions,
}: FilterPopoverProps) => {
  const { owner } = useCasesContext();
  const hasOwner = Boolean(owner.length);
  const options = mapToMultiSelectOption(hasOwner ? owner : availableSolutions);
  const solutions = availableSolutions.map((solution) => mapToReadableSolutionName(solution));

  /**
   * If the user selects and deselects all solutions then the owner is set to an empty array.
   * This results in fetching all cases the user has access to including
   * the ones with read access. We want to show only the cases the user has full access to.
   * For that reason we fallback to availableSolutions if the owner is empty.
   *
   * If the consumer of cases has passed an owner we fallback to the provided owner
   */
  const _onChange = ({
    filterId,
    selectedOptionKeys: newOptions,
  }: {
    filterId: string;
    selectedOptionKeys: string[];
  }) => {
    if (hasOwner) {
      onChange({
        filterId,
        selectedOptionKeys: newOptions.length === 0 ? owner : newOptions,
      });
    } else {
      onChange({
        filterId,
        selectedOptionKeys: newOptions.length === 0 ? availableSolutions : newOptions,
      });
    }
  };

  const selectedOptionsInFilter =
    selectedOptionKeys.length === availableSolutions.length ? [] : selectedOptionKeys;

  const renderOption = (option: EuiSelectableOption) => {
    const solution = solutions.find((solutionData) => solutionData.id === option.label) as Solution;
    return (
      <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon size="m" type={solution.iconType} title={solution.label} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{solution.label}</EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <MultiSelectFilter
      buttonLabel={i18n.SOLUTION}
      id={'owner'}
      onChange={_onChange}
      options={options}
      renderOption={renderOption}
      selectedOptionKeys={selectedOptionsInFilter}
    />
  );
};

SolutionFilterComponent.displayName = 'SolutionFilterComponent';

export const SolutionFilter = React.memo(SolutionFilterComponent);

SolutionFilter.displayName = 'SolutionFilter';
