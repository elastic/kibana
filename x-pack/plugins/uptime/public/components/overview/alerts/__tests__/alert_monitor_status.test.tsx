/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  selectedLocationsToString,
  AlertFieldNumber,
  handleAlertFieldNumberChange,
} from '../alert_monitor_status';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

describe('alert monitor status component', () => {
  describe('handleAlertFieldNumberChange', () => {
    let mockSetIsInvalid: jest.Mock;
    let mockSetFieldValue: jest.Mock;

    beforeEach(() => {
      mockSetIsInvalid = jest.fn();
      mockSetFieldValue = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('sets a valid number', () => {
      handleAlertFieldNumberChange(
        // @ts-ignore no need to implement this entire type here
        { target: { value: '23' } },
        false,
        mockSetIsInvalid,
        mockSetFieldValue
      );
      expect(mockSetIsInvalid).not.toHaveBeenCalled();
      expect(mockSetFieldValue).toHaveBeenCalledTimes(1);
      expect(mockSetFieldValue.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            23,
          ],
        ]
      `);
    });

    it('sets invalid for NaN value', () => {
      handleAlertFieldNumberChange(
        // @ts-ignore no need to implement this entire type here
        { target: { value: 'foo' } },
        false,
        mockSetIsInvalid,
        mockSetFieldValue
      );
      expect(mockSetIsInvalid).toHaveBeenCalledTimes(1);
      expect(mockSetIsInvalid.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            true,
          ],
        ]
      `);
      expect(mockSetFieldValue).not.toHaveBeenCalled();
    });

    it('sets invalid to false when a valid value is received and invalid is true', () => {
      handleAlertFieldNumberChange(
        // @ts-ignore no need to implement this entire type here
        { target: { value: '23' } },
        true,
        mockSetIsInvalid,
        mockSetFieldValue
      );
      expect(mockSetIsInvalid).toHaveBeenCalledTimes(1);
      expect(mockSetIsInvalid.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            false,
          ],
        ]
      `);
      expect(mockSetFieldValue).toHaveBeenCalledTimes(1);
      expect(mockSetFieldValue.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            23,
          ],
        ]
      `);
    });
  });

  describe('AlertFieldNumber', () => {
    it('responds with correct number value when a valid number is specified', () => {
      const mockValueHandler = jest.fn();
      const component = mountWithIntl(
        <AlertFieldNumber
          aria-label="test label"
          data-test-subj="foo"
          disabled={false}
          fieldValue={23}
          setFieldValue={mockValueHandler}
        />
      );
      component.find('input').simulate('change', { target: { value: '45' } });
      expect(mockValueHandler).toHaveBeenCalled();
      expect(mockValueHandler.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            45,
          ],
        ]
      `);
    });

    it('does not set an invalid number value', () => {
      const mockValueHandler = jest.fn();
      const component = mountWithIntl(
        <AlertFieldNumber
          aria-label="test label"
          data-test-subj="foo"
          disabled={false}
          fieldValue={23}
          setFieldValue={mockValueHandler}
        />
      );
      component.find('input').simulate('change', { target: { value: 'not a number' } });
      expect(mockValueHandler).not.toHaveBeenCalled();
      expect(mockValueHandler.mock.calls).toEqual([]);
    });

    it('does not set a number value less than 1', () => {
      const mockValueHandler = jest.fn();
      const component = mountWithIntl(
        <AlertFieldNumber
          aria-label="test label"
          data-test-subj="foo"
          disabled={false}
          fieldValue={23}
          setFieldValue={mockValueHandler}
        />
      );
      component.find('input').simulate('change', { target: { value: '0' } });
      expect(mockValueHandler).not.toHaveBeenCalled();
      expect(mockValueHandler.mock.calls).toEqual([]);
    });
  });

  describe('selectedLocationsToString', () => {
    it('generates a formatted string for a valid list of options', () => {
      const locations = [
        {
          checked: 'on',
          label: 'fairbanks',
        },
        {
          checked: 'on',
          label: 'harrisburg',
        },
        {
          checked: undefined,
          label: 'orlando',
        },
      ];
      expect(selectedLocationsToString(locations)).toEqual('fairbanks, harrisburg');
    });

    it('generates a formatted string for a single item', () => {
      expect(selectedLocationsToString([{ checked: 'on', label: 'fairbanks' }])).toEqual(
        'fairbanks'
      );
    });

    it('returns an empty string when no valid options are available', () => {
      expect(selectedLocationsToString([{ checked: 'off', label: 'harrisburg' }])).toEqual('');
    });
  });
});
