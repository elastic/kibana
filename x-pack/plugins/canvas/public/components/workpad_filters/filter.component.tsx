/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiDescriptionList, EuiPanel, EuiText } from '@elastic/eui';
import {
  FormattedFilterViewInstance,
  Filter as FilterType,
  FilterFieldProps,
} from '../../../types';

interface InteractiveFilterProps {
  filterView: FormattedFilterViewInstance;
  filter: FilterType;
  filterGroups: string[];
  updateFilter: (value: any) => void;
}

interface StaticFilterProps {
  filterView: FormattedFilterViewInstance;
  updateFilter?: (value: any) => void;
  filter?: FilterType;
  filterGroups?: string[];
}

type Props = InteractiveFilterProps | StaticFilterProps;

const titleStyle = {
  width: '30%',
};

const descriptionStyle = {
  width: '70%',
};

const renderElement = (Component: FC<FilterFieldProps>, props: FilterFieldProps) => (
  <Component {...props} />
);

export const Filter: FC<Props> = ({ filterView, ...restProps }) => {
  const view = Object.values(filterView).map((filterValue) => {
    const description = filterValue.component
      ? renderElement(filterValue.component, {
          ...(restProps as InteractiveFilterProps),
          value: filterValue.formattedValue,
        })
      : filterValue.formattedValue;

    return {
      title: (
        <EuiText size="s">
          <h4>{filterValue.label}</h4>
        </EuiText>
      ),
      description: <EuiText size="s">{description}</EuiText>,
    };
  });

  return (
    <EuiPanel grow={false} hasShadow={false} paddingSize="m">
      <EuiDescriptionList
        type="column"
        className="workpadFilter"
        compressed
        listItems={view}
        titleProps={{ style: titleStyle, className: 'eui-textBreakWord' }}
        descriptionProps={{ style: descriptionStyle, className: 'eui-textBreakWord' }}
      />
    </EuiPanel>
  );
};
