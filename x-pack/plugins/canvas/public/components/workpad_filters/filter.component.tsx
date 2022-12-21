/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiDescriptionList, EuiPanel, EuiText } from '@elastic/eui';
import { FormattedFilterViewInstance } from '../../../types';

interface Props {
  filter: FormattedFilterViewInstance;
  updateFilter?: (value: any) => void;
}

type CustomComponentProps = Omit<Props, 'filter'> & { value: string };

const titleStyle = {
  width: '30%',
};

const descriptionStyle = {
  width: '70%',
};

const renderElement = (
  Component: FC<
    Omit<CustomComponentProps, 'updateFilter'> & { onChange?: CustomComponentProps['updateFilter'] }
  >,
  { updateFilter, ...props }: CustomComponentProps
) => {
  return <Component {...props} onChange={updateFilter} />;
};

export const Filter: FC<Props> = ({ filter, ...restProps }) => {
  const filterView = Object.values(filter).map((filterValue) => {
    const description = filterValue.component
      ? renderElement(filterValue.component, { value: filterValue.formattedValue, ...restProps })
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
        listItems={filterView}
        titleProps={{ style: titleStyle, className: 'eui-textBreakWord' }}
        descriptionProps={{ style: descriptionStyle, className: 'eui-textBreakWord' }}
      />
    </EuiPanel>
  );
};
