/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment } from 'react';
import {
  EuiButton,
  EuiPopover,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { FilterExpanded } from './filter_expanded';
import { DataSeries } from '../../types';
import { FieldLabels } from '../../configurations/constants';
import { SelectedFilters } from '../selected_filters';

interface Props {
  seriesId: string;
  defaultFilters: DataSeries['defaultFilters'];
}

export interface Field {
  label: string;
  field: string;
}

export const SeriesFilter = ({ seriesId, defaultFilters = [] }: Props) => {
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);

  const [selectedField, setSelectedField] = useState<Field | null>(null);

  const options = defaultFilters.map((field) => ({ label: FieldLabels[field], field }));

  const button = (
    <EuiButtonEmpty
      iconType="plus"
      onClick={() => {
        setIsPopoverVisible(true);
      }}
    >
      Add filter
    </EuiButtonEmpty>
  );

  const mainPanel = (
    <>
      <EuiSpacer size="s" />
      {options.map((opt) => (
        <Fragment key={opt.label}>
          <EuiButton
            fullWidth={true}
            iconType="arrowRight"
            iconSide="right"
            onClick={() => {
              setSelectedField(opt);
            }}
          >
            {opt.label}
          </EuiButton>
          <EuiSpacer size="s" />
        </Fragment>
      ))}
    </>
  );

  const childPanel = selectedField ? (
    <FilterExpanded
      field={selectedField.field}
      label={selectedField.label}
      goBack={() => {
        setSelectedField(null);
      }}
    />
  ) : null;

  const closePopover = () => {
    setIsPopoverVisible(false);
    setSelectedField(null);
  };

  return (
    <EuiFlexGroup wrap direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={button}
          isOpen={isPopoverVisible}
          closePopover={closePopover}
          anchorPosition="rightCenter"
        >
          {!selectedField ? mainPanel : childPanel}
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem>
        <SelectedFilters seriesId={seriesId} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
