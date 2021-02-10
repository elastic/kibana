/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { sortBy } from 'lodash';
import { SearchFilterConfig } from '@elastic/eui';
import { Tag } from '../components/tag';
import { getId } from './get_id';
import { tagsRegistry } from './tags_registry';
import { ComponentStrings } from '../../i18n';

const { WorkpadTemplates: strings } = ComponentStrings;

// EUI helper function
// generates the FieldValueSelectionFilter object for EuiSearchBar for tag filtering
export const getTagsFilter = (type: 'health' | 'badge'): SearchFilterConfig => {
  const uniqueTags = sortBy(Object.values(tagsRegistry.toJS()), 'name');
  const filterType = 'field_value_selection';

  return {
    type: filterType,
    field: 'tag',
    name: strings.getTableTagsColumnTitle(),
    multiSelect: true,
    options: uniqueTags.map(({ name, color }) => ({
      value: name,
      name,
      view: (
        <div>
          <Tag key={getId('tag')} color={color} name={name} type={type} />
        </div>
      ),
    })),
  };
};
