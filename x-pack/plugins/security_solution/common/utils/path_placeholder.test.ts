/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPlaceholderTextByOSType, getPlaceholderText } from './path_placeholder';
import {
  ConditionEntryField,
  OperatingSystem,
  TrustedAppEntryTypes,
} from '@kbn/securitysolution-utils';

const trustedAppEntry = {
  os: OperatingSystem.LINUX,
  field: ConditionEntryField.HASH,
  type: 'match' as TrustedAppEntryTypes,
};

describe('Trusted Apps: Path placeholder text', () => {
  it('returns no placeholder text when field IS NOT PATH', () => {
    expect(getPlaceholderTextByOSType({ ...trustedAppEntry })).toEqual(undefined);
  });

  it('returns a placeholder text when field IS PATH', () => {
    expect(
      getPlaceholderTextByOSType({ ...trustedAppEntry, field: ConditionEntryField.PATH })
    ).toEqual(getPlaceholderText().others.exact);
  });

  it('returns LINUX/MAC equivalent placeholder when field IS PATH', () => {
    expect(
      getPlaceholderTextByOSType({
        ...trustedAppEntry,
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
      })
    ).toEqual(getPlaceholderText().others.exact);
  });

  it('returns LINUX/MAC equivalent placeholder text when field IS PATH and WILDCARD operator is selected', () => {
    expect(
      getPlaceholderTextByOSType({
        ...trustedAppEntry,
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
      })
    ).toEqual(getPlaceholderText().others.wildcard);
  });

  it('returns WINDOWS equivalent placeholder text when field IS PATH', () => {
    expect(
      getPlaceholderTextByOSType({
        ...trustedAppEntry,
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
      })
    ).toEqual(getPlaceholderText().windows.exact);
  });

  it('returns WINDOWS equivalent placeholder text when field IS PATH and WILDCARD operator is selected', () => {
    expect(
      getPlaceholderTextByOSType({
        ...trustedAppEntry,
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
      })
    ).toEqual(getPlaceholderText().windows.wildcard);
  });
});
