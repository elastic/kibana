/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { FiltersExpressionsSelect } from './filters_expression_select';
import { render } from '../../../../lib/helper/rtl_helpers';
import { filterAriaLabels as aria } from './translations';
import * as Hooks from '@kbn/observability-plugin/public/hooks/use_values_list';

describe('FiltersExpressionSelect', () => {
  const LOCATION_FIELD_NAME = 'observer.geo.name';
  const PORT_FIELD_NAME = 'url.port';
  const SCHEME_FIELD_NAME = 'monitor.type';
  const TAG_FIELD_NAME = 'tags';

  it('is empty when no filters available', async () => {
    const { queryByLabelText } = render(
      <FiltersExpressionsSelect
        ruleParams={{}}
        newFilters={[]}
        onRemoveFilter={jest.fn()}
        setRuleParams={jest.fn()}
        shouldUpdateUrl={false}
      />
    );

    await waitFor(() => {
      for (const label of Object.values(aria)) {
        expect(queryByLabelText(label)).toBeNull();
      }
    });
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
  ])('contains provided new filter values', async (newFilters, expectedLabels, absentLabels) => {
    const { getByLabelText, queryByLabelText } = render(
      <FiltersExpressionsSelect
        ruleParams={{}}
        newFilters={newFilters}
        onRemoveFilter={jest.fn()}
        setRuleParams={jest.fn()}
        shouldUpdateUrl={false}
      />
    );
    await waitFor(() => {
      expectedLabels.forEach((label) => expect(getByLabelText(label)));
      absentLabels.forEach((label) => expect(queryByLabelText(label)).toBeNull());
    });
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
        ruleParams={{}}
        newFilters={[LOCATION_FIELD_NAME, SCHEME_FIELD_NAME, PORT_FIELD_NAME, TAG_FIELD_NAME]}
        onRemoveFilter={onRemoveFilterMock}
        setRuleParams={setAlertParamsMock}
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

  it.each([
    [[TAG_FIELD_NAME], aria.TAG],
    [[PORT_FIELD_NAME], aria.PORT],
    [[SCHEME_FIELD_NAME], aria.SCHEME],
    [[LOCATION_FIELD_NAME], aria.LOCATION],
  ])(
    'applies accessible label to filter expressions, and contains selected filters',
    /**
     * @param filters the set of filters the test should supply as props
     * @param newFilters the set of filter item types the component should render
     * @param expectedFilterButtonAriaLabel the aria label for the popover button for the targeted filter
     * @param filterLabel the name of the filter label expected in each item's aria-label
     * @param expectedFilterItems the set of filter options the component should render
     */
    async (newFilters, expectedFilterButtonAriaLabel) => {
      const spy = jest.spyOn(Hooks, 'useValuesList');
      spy.mockReturnValue({ loading: false, values: [{ label: 'test-label', count: 3 }] });
      const { getByLabelText, getByText } = render(
        <FiltersExpressionsSelect
          ruleParams={{}}
          newFilters={newFilters}
          onRemoveFilter={jest.fn()}
          setRuleParams={jest.fn()}
          shouldUpdateUrl={false}
        />
      );

      const filterButton = getByLabelText(expectedFilterButtonAriaLabel);

      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(getByText('Apply'));
      });
    }
  );
});
