/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { fireEvent, waitFor } from '@testing-library/react';
import { FiltersExpressionsSelect } from './filters_expression_select';
import { render } from '../../../../lib/helper/rtl_helpers';
import { filterAriaLabels as aria } from './translations';
import { filterLabels } from '../../filter_group/translations';

describe('FiltersExpressionSelect', () => {
  const LOCATION_FIELD_NAME = 'observer.geo.name';
  const PORT_FIELD_NAME = 'url.port';
  const SCHEME_FIELD_NAME = 'monitor.type';
  const TAG_FIELD_NAME = 'tags';

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
        shouldUpdateUrl={false}
      />
    );
    expect(component).toMatchInlineSnapshot(`<Fragment />`);
  });

  it.each([
    [[LOCATION_FIELD_NAME], [aria.LOCATION], [aria.TAG, aria.PORT, aria.SCHEME]],
    [
      [LOCATION_FIELD_NAME, TAG_FIELD_NAME],
      [aria.LOCATION, aria.TAG],
      [aria.PORT, aria.SCHEME],
    ],
    [
      [PORT_FIELD_NAME, SCHEME_FIELD_NAME],
      [aria.PORT, aria.SCHEME],
      [aria.LOCATION, aria.TAG],
    ],
    [[TAG_FIELD_NAME], [aria.TAG], [aria.LOCATION, aria.PORT, aria.SCHEME]],
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
        shouldUpdateUrl={false}
      />
    );
    expectedLabels.forEach((label) => expect(getByLabelText(label)));
    absentLabels.forEach((label) => expect(queryByLabelText(label)).toBeNull());
  });

  it.each([
    ['Remove filter Location', LOCATION_FIELD_NAME],
    ['Remove filter Scheme', SCHEME_FIELD_NAME],
    ['Remove filter Port', PORT_FIELD_NAME],
    ['Remove filter Tag', TAG_FIELD_NAME],
  ])('fires remove filter handler', async (removeButtonLabel, expectedFieldName) => {
    const onRemoveFilterMock = jest.fn();
    const setAlertParamsMock = jest.fn();
    const { getByLabelText } = render(
      <FiltersExpressionsSelect
        alertParams={{}}
        newFilters={[LOCATION_FIELD_NAME, SCHEME_FIELD_NAME, PORT_FIELD_NAME, TAG_FIELD_NAME]}
        onRemoveFilter={onRemoveFilterMock}
        filters={{
          tags: ['prod'],
          ports: [5601],
          schemes: ['http'],
          locations: ['nyc'],
        }}
        setAlertParams={setAlertParamsMock}
        shouldUpdateUrl={false}
      />
    );

    const removeButton = getByLabelText(removeButtonLabel);
    fireEvent.click(removeButton);
    expect(onRemoveFilterMock).toHaveBeenCalledTimes(1);
    expect(onRemoveFilterMock).toHaveBeenCalledWith(expectedFieldName);
    expect(setAlertParamsMock).toHaveBeenCalledTimes(1);
    expect(setAlertParamsMock).toHaveBeenCalledWith('filters', {
      [SCHEME_FIELD_NAME]: [],
      [LOCATION_FIELD_NAME]: [],
      [TAG_FIELD_NAME]: [],
      [PORT_FIELD_NAME]: [],
    });
  });

  const TEST_TAGS = ['foo', 'bar'];
  const TEST_PORTS = [5601, 9200];
  const TEST_SCHEMES = ['http', 'tcp'];
  const TEST_LOCATIONS = ['nyc', 'fairbanks'];

  it.each([
    [
      {
        tags: TEST_TAGS,
        ports: [5601, 9200],
        schemes: ['http', 'tcp'],
        locations: ['nyc', 'fairbanks'],
      },
      [TAG_FIELD_NAME],
      aria.TAG,
      filterLabels.TAG,
      TEST_TAGS,
    ],
    [
      {
        tags: [],
        ports: TEST_PORTS,
        schemes: [],
        locations: [],
      },
      [PORT_FIELD_NAME],
      aria.PORT,
      filterLabels.PORT,
      TEST_PORTS,
    ],
    [
      {
        tags: [],
        ports: [],
        schemes: TEST_SCHEMES,
        locations: [],
      },
      [SCHEME_FIELD_NAME],
      aria.SCHEME,
      filterLabels.SCHEME,
      TEST_SCHEMES,
    ],
    [
      {
        tags: [],
        ports: [],
        schemes: [],
        locations: TEST_LOCATIONS,
      },
      [LOCATION_FIELD_NAME],
      aria.LOCATION,
      filterLabels.LOCATION,
      TEST_LOCATIONS,
    ],
  ])(
    'applies accessible label to filter expressions, and contains selected filters',
    /**
     * @param filters the set of filters the test should supply as props
     * @param newFilters the set of filter item types the component should render
     * @param expectedFilterButtonAriaLabel the aria label for the popover button for the targeted filter
     * @param filterLabel the name of the filter label expected in each item's aria-label
     * @param expectedFilterItems the set of filter options the component should render
     */
    async (
      filters,
      newFilters,
      expectedFilterButtonAriaLabel,
      filterLabel,
      expectedFilterItems
    ) => {
      const { getByLabelText } = render(
        <FiltersExpressionsSelect
          alertParams={{}}
          newFilters={newFilters}
          onRemoveFilter={jest.fn()}
          filters={filters}
          setAlertParams={jest.fn()}
          shouldUpdateUrl={false}
        />
      );

      const filterButton = getByLabelText(expectedFilterButtonAriaLabel);

      fireEvent.click(filterButton);

      await waitFor(() => {
        expectedFilterItems.forEach((filterItem: string | number) =>
          expect(getByLabelText(`Filter by ${filterLabel} ${filterItem}.`))
        );
      });
    }
  );
});
