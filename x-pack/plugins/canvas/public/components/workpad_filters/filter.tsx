/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiDescriptionList, EuiPanel } from '@elastic/eui';
import { FormattedFilterViewInstance } from '../../../types';

interface Props {
  filter: FormattedFilterViewInstance;
}

const titleStyle = {
  width: '40%',
};

const descriptionStyle = {
  width: '60%',
};

export const Filter: FC<Props> = ({ filter }) => {
  const filterView = Object.values(filter).map((filterValue) => ({
    title: filterValue.label,
    description: filterValue.formattedValue,
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
