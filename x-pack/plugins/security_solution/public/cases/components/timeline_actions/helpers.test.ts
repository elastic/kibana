/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createUpdateSuccessToaster } from './helpers';
import { Case } from '../../containers/types';

const theCase = {
  title: 'My case',
  settings: {
    syncAlerts: true,
  },
} as Case;

describe('helpers', () => {
  describe('createUpdateSuccessToaster', () => {
    it('creates the correct toast when the sync alerts is on', () => {
      // We remove the id as is randomly generated
      const { id, ...toast } = createUpdateSuccessToaster(theCase);
      expect(toast).toEqual({
        color: 'success',
        iconType: 'check',
        text: 'Alerts in this case have their status synched with the case status',
        title: 'An alert has been added to "My case"',
      });
    });

    it('creates the correct toast when the sync alerts is off', () => {
      // We remove the id as is randomly generated
      const { id, ...toast } = createUpdateSuccessToaster({
        ...theCase,
        settings: { syncAlerts: false },
      });
      expect(toast).toEqual({
        color: 'success',
        iconType: 'check',
        title: 'An alert has been added to "My case"',
      });
    });
  });
});
