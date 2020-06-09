/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { FiltersExpressionsSelect } from '../filters_expression_select';

describe('filters expression select component', () => {
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

  it('contains provided new filter values', () => {
    const component = shallowWithIntl(
      <FiltersExpressionsSelect
        alertParams={{}}
        newFilters={['observer.geo.name']}
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
    expect(component).toMatchInlineSnapshot(`
      <Fragment>
        <EuiFlexGroup
          key="filter_location"
        >
          <EuiFlexItem>
            <FilterPopover
              btnContent={
                <EuiExpression
                  aria-label="ariaLabel"
                  color="secondary"
                  data-test-subj="uptimeCreateStatusAlert.filter_location"
                  description="From"
                  onClick={[Function]}
                  value="any location"
                />
              }
              disabled={true}
              fieldName="observer.geo.name"
              forceOpen={false}
              id="filter_location"
              items={Array []}
              loading={false}
              onFilterFieldChange={[Function]}
              selectedItems={Array []}
              setForceOpen={[Function]}
              title="Scheme"
            />
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
          >
            <EuiButtonIcon
              aria-label="Remove filter"
              color="danger"
              iconType="trash"
              onClick={[Function]}
            />
          </EuiFlexItem>
          <EuiSpacer
            size="xs"
          />
        </EuiFlexGroup>
        <EuiSpacer
          size="xs"
        />
      </Fragment>
    `);
  });

  it('contains provided selected filter values', () => {
    const component = shallowWithIntl(
      <FiltersExpressionsSelect
        alertParams={{}}
        newFilters={['tags']}
        onRemoveFilter={jest.fn()}
        filters={{
          tags: ['foo', 'bar'],
          ports: [],
          schemes: [],
          locations: [],
        }}
        setAlertParams={jest.fn()}
        setUpdatedFieldValues={jest.fn()}
        shouldUpdateUrl={false}
      />
    );
    expect(component).toMatchInlineSnapshot(`
      <Fragment>
        <EuiFlexGroup
          key="filter_tags"
        >
          <EuiFlexItem>
            <FilterPopover
              btnContent={
                <EuiExpression
                  aria-label="ariaLabel"
                  color="secondary"
                  data-test-subj="uptimeCreateStatusAlert.filter_tags"
                  description="Using"
                  onClick={[Function]}
                  value="any tag"
                />
              }
              disabled={false}
              fieldName="tags"
              forceOpen={false}
              id="filter_tags"
              items={
                Array [
                  "foo",
                  "bar",
                ]
              }
              loading={false}
              onFilterFieldChange={[Function]}
              selectedItems={Array []}
              setForceOpen={[Function]}
              title="Tags"
            />
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
          >
            <EuiButtonIcon
              aria-label="Remove filter"
              color="danger"
              iconType="trash"
              onClick={[Function]}
            />
          </EuiFlexItem>
          <EuiSpacer
            size="xs"
          />
        </EuiFlexGroup>
        <EuiSpacer
          size="xs"
        />
      </Fragment>
    `);
  });
});
