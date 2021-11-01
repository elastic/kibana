/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';
import { FormattedFilterViewInstance } from '../../../types';
import { getFilterFormatter } from '../../lib/filter';
import { Filter } from './filter';
import { FiltersGroup as FiltersGroupType } from './types';

interface Props {
  filtersGroup: FiltersGroupType;
}

const panelStyle = {
  paddingRight: '12px',
  paddingTop: '15px',
};

const strings = {
  getWithoutGroupLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.filters_group.withoutGroup', {
      defaultMessage: 'Without group',
    }),
};

export const FiltersGroup: FC<Props> = ({ filtersGroup }) => {
  const { name, filters: groupFilters } = filtersGroup;

  const filterViews: FormattedFilterViewInstance[] = groupFilters.map((filter) =>
    getFilterFormatter(filter.type)(filter)
  );

  const filtersComponents = filterViews.map((filter, index) => (
    <Filter key={`filter-${name}-${index}`} filter={filter} />
  ));

  return (
    <div className="canvasSidebar__expandable">
      <EuiAccordion
        id="canvas-element-stats"
        buttonContent={name ?? strings.getWithoutGroupLabel()}
        initialIsOpen={true}
        className="canvasSidebar__accordion"
        style={{ marginLeft: '0px' }}
      >
        <div style={panelStyle}>{filtersComponents}</div>
      </EuiAccordion>
    </div>
  );
};
