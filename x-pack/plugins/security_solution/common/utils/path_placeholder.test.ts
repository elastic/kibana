/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPlaceholderText, placeholderText } from './path_placeholder';
import { ConditionEntryField, OperatingSystem, TrustedAppEntryTypes } from '../endpoint/types';

const trustedAppEntry = {
  os: OperatingSystem.LINUX,
  field: ConditionEntryField.HASH,
  type: 'match' as TrustedAppEntryTypes,
};

describe('Trusted Apps: Path placeholder text', () => {
  it('returns no placeholder text when field IS NOT PATH', () => {
    expect(getPlaceholderText({ ...trustedAppEntry })).toEqual(undefined);
  });

  it('returns a placeholder text when field IS PATH', () => {
    expect(getPlaceholderText({ ...trustedAppEntry, field: ConditionEntryField.PATH })).toEqual(
      placeholderText().others.exact
    );
  });

  it('returns LINUX/MAC equivalent placholder when field IS PATH', () => {
    expect(
      getPlaceholderText({
        ...trustedAppEntry,
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
      })
    ).toEqual(placeholderText().others.exact);
  });

  it('returns LINUX/MAC equivalent placholder text when field IS PATH and WILDCARD operator is selected', () => {
    expect(
      getPlaceholderText({
        ...trustedAppEntry,
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
      })
    ).toEqual(placeholderText().others.wildcard);
  });

  it('returns WINDOWS equivalent placholder text when field IS PATH', () => {
    expect(
      getPlaceholderText({
        ...trustedAppEntry,
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
      })
    ).toEqual(placeholderText().windows.exact);
  });

  it('returns WINDOWS equivalent placeholder text when field IS PATH and WILDCARD operator is selected', () => {
    expect(
      getPlaceholderText({
        ...trustedAppEntry,
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
      })
    ).toEqual(placeholderText().windows.wildcard);
  });
});
