/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ExceptionStacktrace } from './ExceptionStacktrace';

describe('ExceptionStacktrace', () => {
  describe('render', () => {
    it('renders', () => {
      const props = { exceptions: [] };

      expect(() =>
        shallow(<ExceptionStacktrace {...props} />)
      ).not.toThrowError();
    });

    describe('with a stack trace', () => {
      it('renders the stack trace', () => {
        const props = { exceptions: [{}] };

        expect(
          shallow(<ExceptionStacktrace {...props} />).find('Stacktrace')
        ).toHaveLength(1);
      });
    });

    describe('with more than one stack trace', () => {
      it('renders a cause stack trace', () => {
        const props = { exceptions: [{}, {}] };

        expect(
          shallow(<ExceptionStacktrace {...props} />).find('CauseStacktrace')
        ).toHaveLength(1);
      });
    });
  });
});
