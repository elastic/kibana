/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelectableLIOption } from '@elastic/eui/src/components/selectable/selectable_option';

import { CrawlerDomain } from '../../types';

import { getCheckedOptionLabels, getSelectableOptions } from './utils';

describe('getCheckedOptionLabels', () => {
  it('returns the labels of selected options', () => {
    const options = [{ label: 'title' }, { label: 'description', checked: 'on' }] as Array<
      EuiSelectableLIOption<object>
    >;

    expect(getCheckedOptionLabels(options)).toEqual(['description']);
  });
});

describe('getSelectableOptions', () => {
  it('returns all available fields when we want all fields', () => {
    expect(
      getSelectableOptions(
        {
          availableDeduplicationFields: ['title', 'description'],
          deduplicationFields: ['title'],
          deduplicationEnabled: true,
        } as CrawlerDomain,
        true
      )
    ).toEqual([
      { label: 'title', checked: 'on' },
      { label: 'description', checked: undefined },
    ]);
  });

  it('can returns only selected fields', () => {
    expect(
      getSelectableOptions(
        {
          availableDeduplicationFields: ['title', 'description'],
          deduplicationFields: ['title'],
          deduplicationEnabled: true,
        } as CrawlerDomain,
        false
      )
    ).toEqual([{ label: 'title', checked: 'on' }]);
  });

  it('disables all options when deduplication is disabled', () => {
    expect(
      getSelectableOptions(
        {
          availableDeduplicationFields: ['title', 'description'],
          deduplicationFields: ['title'],
          deduplicationEnabled: false,
        } as CrawlerDomain,
        true
      )
    ).toEqual([
      { label: 'title', checked: 'on', disabled: true },
      { label: 'description', checked: undefined, disabled: true },
    ]);
  });
});
