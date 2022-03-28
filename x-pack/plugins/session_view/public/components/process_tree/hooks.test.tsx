/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventAction } from '../../../common/types/process_tree';
import { mockEvents } from '../../../common/mocks/constants/session_view_process.mock';
import { ProcessImpl } from './hooks';

describe('ProcessTree hooks', () => {
  describe('ProcessImpl.getDetails memoize will cache bust on new events', () => {
    it('should return the exec event details when this.events changes', () => {
      const process = new ProcessImpl(mockEvents[0].process.entity_id);

      process.addEvent(mockEvents[0]);

      let result = process.getDetails();

      // push exec event
      process.addEvent(mockEvents[1]);

      result = process.getDetails();

      expect(result.event.action).toEqual(EventAction.exec);
    });
  });
});
