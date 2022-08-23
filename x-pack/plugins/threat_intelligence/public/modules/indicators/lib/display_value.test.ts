/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  generateMockFileIndicator,
  generateMockIpIndicator,
  generateMockUrlIndicator,
  generateMockFileMd5Indicator,
  generateMockDomainIndicator,
  generateMockEmailAddrIndicator,
  generateMockDomainNameIndicator,
  generateMockX509CertificateIndicator,
  generateMockX509SerialIndicator,
  generateMockUnknownIndicator,
  generateMockWindowsRegistryKeyIndicator,
  generateMockAutonomousSystemIndicator,
  generateMockMacAddressIndicator,
  Indicator,
  RawIndicatorFieldId,
} from '../../../../common/types/indicator';
import { displayField, displayValue } from './display_value';

type ExpectedIndicatorValue = string | null;

const cases: Array<[Indicator, ExpectedIndicatorValue]> = [
  [generateMockIpIndicator(), '12.68.554.87'],
  [generateMockUrlIndicator(), 'https://google.com'],
  [generateMockFileIndicator(), 'sample_sha256_hash'],
  [generateMockFileMd5Indicator(), 'sample_md5_hash'],
  [generateMockEmailAddrIndicator(), 'sample@example.com'],
  [generateMockDomainIndicator(), 'google.com'],
  [generateMockDomainNameIndicator(), 'google.com'],
  [generateMockX509CertificateIndicator(), 'sample_serial_number'],
  [generateMockX509SerialIndicator(), 'sample_serial_bla'],
  [generateMockUnknownIndicator(), 'sample_id'],
  [generateMockWindowsRegistryKeyIndicator(), 'sample_registry_key'],
  [generateMockAutonomousSystemIndicator(), 'sample_as_number'],
  [generateMockMacAddressIndicator(), 'sample_mac_address'],

  // Indicator with no fields should yield null as a display value
  [{ fields: {} }, null],

  // Same for an empty object
  [{} as any, null],

  // And falsy value
  [null, null],
];

describe('displayValue()', () => {
  describe.each<[Indicator, ExpectedIndicatorValue]>(cases)(
    '%s',
    (indicator, expectedDisplayValue) => {
      it(`should render the indicator as ${expectedDisplayValue}`, () => {
        expect(displayValue(indicator)).toEqual(expectedDisplayValue);
      });
    }
  );
});

describe('displayValueField()', () => {
  it('should return correct RawIndicatorFieldId for valid field', () => {
    const mockIndicator = generateMockIndicator();
    const result = displayField(mockIndicator);
    expect(result).toEqual(RawIndicatorFieldId.Ip);
  });

  it('should return null for invalid field', () => {
    const mockIndicator = generateMockIndicator();
    mockIndicator.fields['threat.indicator.type'] = ['abc'];
    const result = displayField(mockIndicator);
    expect(result).toBeUndefined();
  });
});
