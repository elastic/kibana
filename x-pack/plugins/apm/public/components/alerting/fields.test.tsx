/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { ServiceField, TransactionTypeField } from './fields';
import { act, fireEvent, render } from '@testing-library/react';
import { expectTextsInDocument } from '../../utils/testHelpers';

describe('alerting fields', () => {
  describe('Service Field', () => {
    it('renders with value', () => {
      const component = render(<ServiceField value="foo" />);
      expectTextsInDocument(component, ['foo']);
    });
    it('renders with All when value is not defined', () => {
      const component = render(<ServiceField />);
      expectTextsInDocument(component, ['All']);
    });
  });
  describe('Transaction Type Field', () => {
    it('renders select field when multiple options available', () => {
      const options = [
        { text: 'Foo', value: 'foo' },
        { text: 'Bar', value: 'bar' },
      ];
      const { getByText, getByTestId } = render(
        <TransactionTypeField currentValue="Foo" options={options} />
      );

      act(() => {
        fireEvent.click(getByText('Foo'));
      });

      const selectBar = getByTestId('transactionTypeField');
      expect(selectBar instanceof HTMLSelectElement).toBeTruthy();
      const selectOptions = (selectBar as HTMLSelectElement).options;
      expect(selectOptions.length).toEqual(2);
      expect(
        Object.values(selectOptions).map((option) => option.value)
      ).toEqual(['foo', 'bar']);
    });
    it('renders read-only field when single option available', () => {
      const options = [{ text: 'Bar', value: 'bar' }];
      const component = render(
        <TransactionTypeField currentValue="Bar" options={options} />
      );
      expectTextsInDocument(component, ['Bar']);
    });
    it('renders read-only All option when no option available', () => {
      const component = render(<TransactionTypeField currentValue="" />);
      expectTextsInDocument(component, ['All']);
    });

    it('renders current value when available', () => {
      const component = render(<TransactionTypeField currentValue="foo" />);
      expectTextsInDocument(component, ['foo']);
    });
  });
});
