/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiDescriptionList, EuiPanel } from '@elastic/eui';
import { Filter as FilterType, FormattedFilterViewInstance } from '../../../types';

interface Props {
  filter: FormattedFilterViewInstance;
  filters: FilterType[];
  updateFilter: (value: any) => void;
}

const titleStyle = {
  width: '40%',
};

const descriptionStyle = {
  width: '60%',
};

type CustomComponentProps = Omit<Props, 'filter'> & { value: string };

const renderElement = (
  Component: FC<
    Omit<CustomComponentProps, 'updateFilter'> & { onChange: CustomComponentProps['updateFilter'] }
  >,
  { updateFilter, ...props }: CustomComponentProps
) => {
  return <Component {...props} onChange={updateFilter} />;
};

export const Filter: FC<Props> = ({ filter, ...restProps }) => {
  const filterView = Object.values(filter).map((filterValue) => ({
    title: filterValue.label,
    description: filterValue.component
      ? renderElement(filterValue.component, { value: filterValue.formattedValue, ...restProps })
      : filterValue.formattedValue,
  }));

  return (
    <EuiPanel grow={false} hasShadow={false}>
      <EuiDescriptionList
        type="column"
        listItems={filterView}
        titleProps={{ style: titleStyle, className: 'eui-textBreakWord' }}
        descriptionProps={{ style: descriptionStyle, className: 'eui-textBreakWord' }}
      />
    </EuiPanel>
  );
};
