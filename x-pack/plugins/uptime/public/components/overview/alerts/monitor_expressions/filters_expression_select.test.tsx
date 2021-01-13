/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { FiltersExpressionsSelect } from './filters_expression_select';
import { render } from '../../../../lib/helper/rtl_helpers';
import { filterAriaLabels } from './translations';

describe('FiltersExpressionSelect', () => {
  it('is empty when no filters available', () => {
    const component = shallowWithIntl(
      <FiltersExpressionsSelect
        alertParams={{}}
        newFilters={[]}
        onRemoveFilter={jest.fn()}
        filters={{
          locations: [],
          ports: [],
          schemes: [],
          tags: [],
        }}
        setAlertParams={jest.fn()}
        setUpdatedFieldValues={jest.fn()}
        shouldUpdateUrl={false}
      />
    );
    expect(component).toMatchInlineSnapshot(`
      <Fragment>
        <EuiSpacer
          size="xs"
        />
      </Fragment>
    `);
  });

  it.each([
    [
      ['observer.geo.name'],
      [filterAriaLabels.LOCATION],
      [filterAriaLabels.TAG, filterAriaLabels.PORT, filterAriaLabels.SCHEME],
    ],
    [
      ['observer.geo.name', 'tags'],
      [filterAriaLabels.LOCATION, filterAriaLabels.TAG],
      [filterAriaLabels.PORT, filterAriaLabels.SCHEME],
    ],
    [
      ['url.port', 'monitor.type'],
      [filterAriaLabels.PORT, filterAriaLabels.SCHEME],
      [filterAriaLabels.LOCATION, filterAriaLabels.TAG],
    ],
  ])('contains provided new filter values', (newFilters, expectedLabels, absentLabels) => {
    const { getByLabelText, queryByLabelText } = render(
      <FiltersExpressionsSelect
        alertParams={{}}
        newFilters={newFilters}
        onRemoveFilter={jest.fn()}
        filters={{
          tags: [],
          ports: [],
          schemes: [],
          locations: [],
        }}
        setAlertParams={jest.fn()}
        setUpdatedFieldValues={jest.fn()}
        shouldUpdateUrl={false}
      />
    );
    expectedLabels.forEach((label) => expect(getByLabelText(label)));
    absentLabels.forEach((label) => expect(queryByLabelText(label)).toBeNull());
  });

  it.each([
    [
      {
        tags: ['foo', 'bar'],
        ports: [],
        schemes: [],
        locations: [],
      },
      filterAriaLabels.TAG,
    ],
    [
      {
        tags: [],
        ports: [5601, 9200],
        schemes: [],
        locations: [],
      },
      filterAriaLabels.TAG,
    ],
    [
      {
        tags: [],
        ports: [],
        schemes: ['http', 'tcp'],
        locations: [],
      },
      filterAriaLabels.TAG,
    ],
    [
      {
        tags: [],
        ports: [],
        schemes: [],
        locations: ['nyc', 'fairbanks'],
      },
      filterAriaLabels.TAG,
    ],
  ])(
    'applies accessible label to filter expressions, and contains selected filters',
    async (filters, expectedLabel) => {
      const { getByLabelText } = render(
        <FiltersExpressionsSelect
          alertParams={{}}
          newFilters={['tags']}
          onRemoveFilter={jest.fn()}
          filters={filters}
          setAlertParams={jest.fn()}
          setUpdatedFieldValues={jest.fn()}
          shouldUpdateUrl={false}
        />
      );

      expect(getByLabelText(expectedLabel));
    }
  );
});
