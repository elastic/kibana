/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed } from '@kbn/test-jest-helpers';
import { searchResponse } from './fixtures/search_response';
import { ProfileTree, Props } from '../profile_tree';

describe('ProfileTree', () => {
  it('renders', async () => {
    const props: Props = {
      onHighlight: () => {},
      target: 'searches',
      data: searchResponse,
      onDataInitError: jest.fn(),
    };
    const init = registerTestBed(ProfileTree);
    await init(props);
  });

  it('does not throw despite bad profile data', async () => {
    // For now, ignore the console.error that gets logged.
    const props: Props = {
      onHighlight: () => {},
      target: 'searches',
      onDataInitError: jest.fn(),
      data: [{}] as any,
    };

    const init = registerTestBed(ProfileTree);
    await init(props);
    expect(props.onDataInitError).toHaveBeenCalled();
  });
});
