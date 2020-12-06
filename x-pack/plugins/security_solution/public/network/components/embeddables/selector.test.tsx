/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { State } from '../../../common/store';

import { getDefaultSourcererSelector } from './selector';

jest.mock('../../../common/store/sourcerer', () => ({
  sourcererSelectors: {
    kibanaIndexPatternsSelector: jest.fn().mockReturnValue(jest.fn()),
    scopesSelector: jest.fn().mockReturnValue(jest.fn().mockReturnValue({ default: '' })),
  },
}));

describe('getDefaultSourcererSelector', () => {
  test('Returns correct format', () => {
    const mockMapStateToProps = getDefaultSourcererSelector();
    const result = mockMapStateToProps({} as State);
    expect(result).toHaveProperty('kibanaIndexPatterns');
    expect(result).toHaveProperty('sourcererScope');
  });
});
