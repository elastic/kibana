/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyToClipboard } from '@elastic/eui';

/**
 * Copy to clipboard wrapper component. It allows adding a copy to clipboard functionality to any element.
 * It expects the value to be copied with an optional function to modify the value if necessary.
 *
 * @param copy the copy method from EuiCopy
 * @param rawValue the value to save to the clipboard
 * @param modifier  a function to modify the raw value before saving to the clipboard
 */
export const copyFunction = (
  copy: Function,
  rawValue: string,
  modifier?: (rawValue: string) => string
) => {
  copy();

  if (modifier) {
    const modifiedCopyValue = modifier(rawValue);
    copyToClipboard(modifiedCopyValue);
  } else {
    copyToClipboard(rawValue);
  }
};
