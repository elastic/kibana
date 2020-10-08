/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { CauseStacktrace } from './CauseStacktrace';
import { mountWithTheme } from '../../../utils/testHelpers';

describe('CauseStacktrace', () => {
  describe('render', () => {
    describe('with no stack trace', () => {
      it('renders without the accordion', () => {
        const props = { id: 'testId', message: 'testMessage' };

        expect(
          mountWithTheme(<CauseStacktrace {...props} />).find('CausedBy')
        ).toHaveLength(1);
      });
    });

    describe('with no message and a stack trace', () => {
      it('says "Caused by …', () => {
        const props = {
          id: 'testId',
          stackframes: [{ filename: 'testFilename', line: { number: 1 } }],
        };

        expect(
          mountWithTheme(<CauseStacktrace {...props} />)
            .find('EuiTitle span')
            .text()
        ).toEqual('…');
      });
    });

    describe('with a message and a stack trace', () => {
      it('renders with the accordion', () => {
        const props = {
          id: 'testId',
          message: 'testMessage',
          stackframes: [{ filename: 'testFilename', line: { number: 1 } }],
        };

        expect(
          shallow(<CauseStacktrace {...props} />).find('Styled(EuiAccordion)')
        ).toHaveLength(1);
      });
    });
  });
});
