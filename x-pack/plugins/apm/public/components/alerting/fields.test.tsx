/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ServiceField, TransactionTypeField } from './fields';
import { render } from '@testing-library/react';
import { expectTextsInDocument } from '../../utils/test_helpers';

describe('alerting fields', () => {
  describe('Service Field', () => {
    it('renders with value', () => {
      const component = render(
        <ServiceField currentValue="foo" onChange={() => {}} />
      );
      expectTextsInDocument(component, ['foo']);
    });
    it('renders with All when value is not defined', () => {
      const component = render(<ServiceField onChange={() => {}} />);
      expectTextsInDocument(component, ['All']);
    });
  });

  describe('TransactionTypeField', () => {
    it('renders', () => {
      const component = render(
        <TransactionTypeField currentValue="Bar" onChange={() => {}} />
      );
      expectTextsInDocument(component, ['Bar']);
    });

    it('renders current value when available', () => {
      const component = render(
        <TransactionTypeField currentValue="foo" onChange={() => {}} />
      );
      expectTextsInDocument(component, ['foo']);
    });
  });
});
