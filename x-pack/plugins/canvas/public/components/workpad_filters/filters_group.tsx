/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion } from '@elastic/eui';
import React, { FC } from 'react';
import { FormattedFilterViewInstance } from '../../../types';
import { getFilterFormatter } from '../../lib/filter';
import { Filter } from './filter';
import { FiltersGroup as FiltersGroupType } from './types';

type Props = FiltersGroupType;

const panelStyle = {
  paddingRight: '12px',
  paddingTop: '15px',
};

export const FiltersGroup: FC<Props> = ({ name, filters }) => {
  const filterViews: FormattedFilterViewInstance[] = filters.map((filter) =>
    getFilterFormatter(filter.type)(filter)
  );

  const filtersComponents = filterViews.map((filter, index) => (
    <Filter key={`filter-${name}-${index}`} filter={filter} />
  ));

  return (
    <div>
      <EuiAccordion
        id="canvas-element-stats"
        buttonContent={name}
        initialIsOpen={false}
        className="canvasSidebar__accordion"
        style={{ marginLeft: '0px' }}
      >
        <div style={panelStyle}>{filtersComponents}</div>
      </EuiAccordion>
    </div>
  );
};
