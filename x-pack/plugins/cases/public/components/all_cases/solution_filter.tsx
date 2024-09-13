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
      onChange={onChange}
      options={options}
      renderOption={renderOption}
      selectedOptionKeys={selectedOptionKeys}
      isLoading={false}
    />
  );
};

SolutionFilterComponent.displayName = 'SolutionFilterComponent';

export const SolutionFilter = React.memo(SolutionFilterComponent);

SolutionFilter.displayName = 'SolutionFilter';
