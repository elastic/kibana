/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import React from 'react';
import type { CaseSeverityWithAll, FilterOptions } from '../../containers/types';
import { SeverityAll } from '../../containers/types';
import { severitiesWithAll } from '../severity/config';
import { MultiSelectFilter } from './multi_select_filter';
import * as i18n from './translations';

interface Props {
  selectedOptions: CaseSeverityWithAll[];
  onChange: ({ filterId, options }: { filterId: keyof FilterOptions; options: string[] }) => void;
}

const options = Object.keys(severitiesWithAll) as CaseSeverityWithAll[];

export const SeverityFilter: React.FC<Props> = ({ selectedOptions, onChange }) => {
  const renderOption = (option: EuiSelectableOption) => {
    const severityData = severitiesWithAll[option.label as CaseSeverityWithAll];
    return (
      <EuiFlexGroup gutterSize="xs" alignItems={'center'} responsive={false}>
        <EuiFlexItem grow={false}>
          {option.label === SeverityAll ? (
            <EuiText size="s">{severityData.label}</EuiText>
          ) : (
            <EuiHealth color={severityData.color}>{severityData.label}</EuiHealth>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <MultiSelectFilter
      buttonLabel={i18n.SEVERITY}
      id={'severity'}
      onChange={onChange}
      options={options}
      renderOption={renderOption}
      selectedOptions={selectedOptions}
    />
  );
};
SeverityFilter.displayName = 'SeverityFilter';
