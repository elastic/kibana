/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'jest-styled-components';
import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreStart } from 'kibana/public';
import { coreMock } from 'src/core/public/mocks';
import type { IToasts } from '../../../../../../../../src/core/public';

import { createUpdateSuccessToaster } from './helpers';
import { Case } from '../../../../../../cases/common';

let mockCoreStart: MockedKeys<CoreStart>;
let toasts: IToasts;
let toastsSpy: jest.SpyInstance;

const theCase = {
  id: 'case-id',
  title: 'My case',
  settings: {
    syncAlerts: true,
  },
} as Case;

describe('helpers', () => {
  beforeEach(() => {
    mockCoreStart = coreMock.createStart();
  });

  describe('createUpdateSuccessToaster', () => {
    it('creates the correct toast when the sync alerts is on', () => {
      const onViewCaseClick = jest.fn();

      toasts = mockCoreStart.notifications.toasts;
      toastsSpy = jest.spyOn(mockCoreStart.notifications.toasts, 'addSuccess');
      createUpdateSuccessToaster(toasts, theCase, onViewCaseClick);

      expect(toastsSpy).toHaveBeenCalled();
    });
  });
});
