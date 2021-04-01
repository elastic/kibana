/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUpdateSuccessToaster } from './helpers';
import { Case } from '../../../../../cases/common';

const theCase = {
  id: 'case-id',
  title: 'My case',
  settings: {
    syncAlerts: true,
  },
} as Case;

describe('helpers', () => {
  const onViewCaseClick = jest.fn();

  describe('createUpdateSuccessToaster', () => {
    it('creates the correct toast when the sync alerts is on', () => {
      // We remove the id as is randomly generated and the text as it is a React component
      // which is being test on toaster_content.test.tsx
      const { id, text, ...toast } = createUpdateSuccessToaster(theCase, onViewCaseClick);
      expect(toast).toEqual({
        color: 'success',
        iconType: 'check',
        title: 'An alert has been added to "My case"',
      });
    });
  });
});
