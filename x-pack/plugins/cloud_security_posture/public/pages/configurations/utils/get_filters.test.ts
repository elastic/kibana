/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX } from '../../../../common/constants';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import { DataView } from '@kbn/data-views-plugin/common';
import { getFilters } from './get_filters';

describe('Get Filters', () => {
  let dataViewMock: DataView;
  const fieldKey = 'some_field_name';

  beforeEach(() => {
    dataViewMock = createStubDataView({
      spec: {
        id: CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
        fields: {
          a: {
            searchable: false,
            aggregatable: false,
            name: fieldKey,
            type: 'type',
          },
        },
      },
    });
  });

  it('negate an existing filter', () => {
    const fields = {
      dataView: dataViewMock,
      field: fieldKey,
      value: 'b',
    };
    const initialFilters = getFilters({
      ...fields,
      filters: [],
      negate: false,
    });

    expect(initialFilters.length).toBe(1);
    expect(initialFilters[0].meta.negate).toBe(false);

    const nextFilters = getFilters({
      ...fields,
      filters: initialFilters,
      negate: true,
    });

    expect(nextFilters.length).toBe(1);
    expect(nextFilters[0].meta.negate).toBe(true);
  });
});
