/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { FilterAggForm } from './filter_agg_form';
import { CreateTransformWizardContext } from '../../../../wizard/wizard';
import { KBN_FIELD_TYPES } from '../../../../../../../../../../../../src/plugins/data/common';
import { IndexPattern } from '../../../../../../../../../../../../src/plugins/data/public';
import { FilterTermForm } from './filter_term_form';

describe('FilterAggForm', () => {
  const indexPattern = ({
    fields: {
      getByName: jest.fn((fieldName: string) => {
        if (fieldName === 'test_text_field') {
          return {
            type: KBN_FIELD_TYPES.STRING,
          };
        }
        if (fieldName === 'test_number_field') {
          return {
            type: KBN_FIELD_TYPES.NUMBER,
          };
        }
      }),
    },
  } as unknown) as IndexPattern;

  test('should render only select dropdown on empty configuration', async () => {
    const onChange = jest.fn();

    const { getByLabelText, findByTestId, container } = render(
      <I18nProvider>
        <CreateTransformWizardContext.Provider value={{ indexPattern }}>
          <FilterAggForm aggConfig={{}} selectedField="test_text_field" onChange={onChange} />
        </CreateTransformWizardContext.Provider>
      </I18nProvider>
    );

    expect(getByLabelText('Filter query')).toBeInTheDocument();

    const { options } = (await findByTestId('transformFilterAggTypeSelector')) as HTMLSelectElement;

    expect(container.childElementCount).toBe(1);

    expect(options.length).toBe(4);
    expect(options[0].value).toBe('');
    expect(options[0].selected).toBe(true);
    expect(options[1].value).toBe('bool');
    expect(options[2].value).toBe('exists');
    expect(options[3].value).toBe('term');
  });

  test('should update "filterAgg" and "aggTypeConfig" on change', async () => {
    const onChange = jest.fn();

    const { findByTestId } = render(
      <I18nProvider>
        <CreateTransformWizardContext.Provider value={{ indexPattern }}>
          <FilterAggForm aggConfig={{}} selectedField="test_text_field" onChange={onChange} />
        </CreateTransformWizardContext.Provider>
      </I18nProvider>
    );

    const select = (await findByTestId('transformFilterAggTypeSelector')) as HTMLSelectElement;

    fireEvent.change(select, {
      target: { value: 'term' },
    });

    expect(onChange.mock.calls[0][0]).toMatchObject({
      filterAgg: 'term',
      aggTypeConfig: {
        FilterAggFormComponent: FilterTermForm,
        filterAggConfig: {
          value: undefined,
        },
      },
    });
  });

  test('should reset config of field change', async () => {
    const onChange = jest.fn();

    const { rerender, findByTestId } = render(
      <I18nProvider>
        <CreateTransformWizardContext.Provider value={{ indexPattern }}>
          <FilterAggForm aggConfig={{}} selectedField="test_text_field" onChange={onChange} />
        </CreateTransformWizardContext.Provider>
      </I18nProvider>
    );

    // re-render the same component with different props
    rerender(
      <I18nProvider>
        <CreateTransformWizardContext.Provider value={{ indexPattern }}>
          <FilterAggForm aggConfig={{}} selectedField="test_number_field" onChange={onChange} />
        </CreateTransformWizardContext.Provider>
      </I18nProvider>
    );

    expect(onChange).toHaveBeenCalledWith({});

    const { options } = (await findByTestId('transformFilterAggTypeSelector')) as HTMLSelectElement;

    expect(options.length).toBe(4);
    expect(options[0].value).toBe('');
    expect(options[0].selected).toBe(true);
    expect(options[1].value).toBe('bool');
    expect(options[2].value).toBe('exists');
    expect(options[3].value).toBe('range');
  });

  test('should render additional form if presented in the configuration', async () => {
    const onChange = jest.fn();
    let childChange: Function;
    const DummyComponent = jest.fn(({ config, onChange: onChangeCallback }) => {
      childChange = onChangeCallback;
      return <div />;
    });

    const { findByTestId, container } = render(
      <I18nProvider>
        <CreateTransformWizardContext.Provider value={{ indexPattern }}>
          <FilterAggForm
            aggConfig={{
              filterAgg: 'term',
              aggTypeConfig: {
                FilterAggFormComponent: DummyComponent,
                filterAggConfig: { value: 'test' },
              },
            }}
            selectedField="test_text_field"
            onChange={onChange}
          />
        </CreateTransformWizardContext.Provider>
      </I18nProvider>
    );

    const { options } = (await findByTestId('transformFilterAggTypeSelector')) as HTMLSelectElement;

    expect(options[3].value).toBe('term');
    expect(options[3].selected).toBe(true);
    expect(container.childElementCount).toBe(2);
    // @ts-ignore
    expect(DummyComponent.mock.calls[0][0]).toMatchObject({ config: { value: 'test' } });

    childChange!({ config: { value: 'test_1' } });

    expect(onChange).toHaveBeenCalledWith({
      filterAgg: 'term',
      aggTypeConfig: {
        FilterAggFormComponent: DummyComponent,
        filterAggConfig: { value: 'test_1' },
      },
    });
  });
});
