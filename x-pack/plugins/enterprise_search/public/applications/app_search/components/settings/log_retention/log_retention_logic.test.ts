/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

import { ELogRetentionOptions } from './types';
import { LogRetentionLogic } from './log_retention_logic';

describe('LogRetentionLogic', () => {
  const DEFAULT_VALUES = {
    openModal: null,
  };

  const mount = (defaults?: object) => {
    if (!defaults) {
      resetContext({});
    } else {
      resetContext({
        defaults: {
          enterprise_search: {
            app_search: {
              log_retention_logic: {
                ...defaults,
              },
            },
          },
        },
      });
    }
    LogRetentionLogic.mount();
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(LogRetentionLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setOpenModal', () => {
      describe('openModal', () => {
        it('should be set to the provided value', () => {
          mount();

          LogRetentionLogic.actions.setOpenModal(ELogRetentionOptions.Analytics);

          expect(LogRetentionLogic.values).toEqual({
            ...DEFAULT_VALUES,
            openModal: ELogRetentionOptions.Analytics,
          });
        });
      });
    });
  });
});
