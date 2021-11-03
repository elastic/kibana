/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';
import { formatFilter } from '../../lib/filter';
import { Filter } from './filter';
import { FiltersGroup as FiltersGroupType } from './types';

interface Props {
  filtersGroup: FiltersGroupType;
}

const panelStyle = {
  paddingTop: '15px',
};

const strings = {
  getBlankValueLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.filters_group.blankValue', {
      defaultMessage: '(Blank)',
    }),
};

export const FiltersGroup: FC<Props> = ({ filtersGroup }) => {
  const { name, filters: groupFilters } = filtersGroup;

  const filtersWithViews = groupFilters.map((filter) => ({
    filter,
    filterView: formatFilter(filter),
  }));

  const filtersComponents = filtersWithViews.map((filterWithView, index) => (
    <Filter key={`filter-${name}-${index}`} {...filterWithView} />
  ));

  return (
    <div className="canvasSidebar__expandable">
      <EuiAccordion
        id="canvas-element-stats"
        buttonContent={name ?? strings.getBlankValueLabel()}
        initialIsOpen={true}
        className="canvasSidebar__accordion filtersSidebar__accordion"
        style={{ marginLeft: '0px' }}
      >
        <div style={panelStyle}>{filtersComponents}</div>
      </EuiAccordion>
    </div>
  );
};
