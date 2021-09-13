/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMELINE_ID_REF_NAME } from '../../constants';
import { migrateNoteTimelineIdToReferences, TimelineId } from './notes';

describe('notes migrations', () => {
  describe('7.16.0 timelineId', () => {
    it('removes the timelineId from the migrated document', () => {
      const migratedDoc = migrateNoteTimelineIdToReferences({
        id: '1',
        type: 'awesome',
        attributes: { timelineId: '123' },
      });

      expect(migratedDoc.attributes).toEqual({});
      expect(migratedDoc.references).toEqual([
        // importing the timeline saved objec type from the timeline saved object causes a circular import and causes the jest tests to fail
        { id: '123', name: TIMELINE_ID_REF_NAME, type: 'siem-ui-timeline' },
      ]);
    });

    it('preserves additional fields when migrating timeline id', () => {
      const migratedDoc = migrateNoteTimelineIdToReferences({
        id: '1',
        type: 'awesome',
        attributes: ({ awesome: 'yes', timelineId: '123' } as unknown) as TimelineId,
      });

      expect(migratedDoc.attributes).toEqual({ awesome: 'yes' });
      expect(migratedDoc.references).toEqual([
        { id: '123', name: TIMELINE_ID_REF_NAME, type: 'siem-ui-timeline' },
      ]);
    });
  });
});
