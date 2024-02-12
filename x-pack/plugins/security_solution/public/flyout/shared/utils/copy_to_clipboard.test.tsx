/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyFunction } from './copy_to_clipboard';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
  EuiCopy: jest.fn(({ children: functionAsChild }) => functionAsChild(jest.fn())),
}));

describe('copyFunction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const rawValue = 'rawValue';

  it('should call copy function', () => {
    const euiCopy = jest.fn();

    copyFunction(euiCopy, rawValue);

    expect(euiCopy).toHaveBeenCalled();
  });

  it('should call modifier function if passed', () => {
    const euiCopy = jest.fn();
    const modifiedFc = jest.fn();

    copyFunction(euiCopy, rawValue, modifiedFc);

    expect(modifiedFc).toHaveBeenCalledWith(rawValue);
  });
});
