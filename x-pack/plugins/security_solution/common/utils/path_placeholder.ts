/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConditionEntryField, OperatingSystem, TrustedAppEntryTypes } from '../endpoint/types';

export const placeholderText = {
  windows: {
    wildcard: 'C:\\sample\\**\\*',
    exact: 'C:\\sample\\path.exe',
  },
  others: {
    wildcard: '/opt/**/*',
    exact: '/opt/bin',
  },
};

export const getPlaceholderText = ({
  os,
  field,
  type,
}: {
  os: OperatingSystem;
  field: ConditionEntryField;
  type: TrustedAppEntryTypes;
}): string | undefined => {
  if (field === ConditionEntryField.PATH) {
    if (os === OperatingSystem.WINDOWS) {
      if (type === 'wildcard') {
        return placeholderText.windows.wildcard;
      }
      return placeholderText.windows.exact;
    } else {
      if (type === 'wildcard') {
        return placeholderText.others.wildcard;
      }
      return placeholderText.others.exact;
    }
  }
};
