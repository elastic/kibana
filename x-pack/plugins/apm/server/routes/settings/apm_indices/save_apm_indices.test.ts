/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { saveApmIndices } from './save_apm_indices';
import { SavedObjectsClientContract } from '../../../../../../../src/core/server';

describe('saveApmIndices', () => {
  it('should trim and strip empty settings', async () => {
    const savedObjectsClient = {
      create: jest.fn(),
    } as unknown as SavedObjectsClientContract;

    const apmIndices = {
      settingA: 'aa',
      settingB: '',
      settingC: undefined,
      settingD: null,
      settingE: ' ',
      settingF: 'ff',
      settingG: ' gg ',
    } as any;
    await saveApmIndices(savedObjectsClient, apmIndices);
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      expect.any(String),
      {
        apmIndices: { settingA: 'aa', settingF: 'ff', settingG: 'gg' },
        isSpaceAware: true,
      },
      expect.any(Object)
    );
  });
});
