/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createJiraConnector } from '../../services/test_utils';
import { extractConnectorIdFromJson } from './user_actions';

describe('user action migrations', () => {
  describe('7.15.0 connector ID migration', () => {
    describe('extractConnectorIdFromJson', () => {
      it('returns undefined when action is undefined', () => {
        expect(extractConnectorIdFromJson({ actionFields: [], jsonBlob: null })).toBeUndefined();
      });

      it('returns undefined when actionFields is undefined', () => {
        expect(extractConnectorIdFromJson({ action: 'a' })).toBeUndefined();
      });

      it('returns undefined when jsonBlob is undefined', () => {
        expect(extractConnectorIdFromJson({ action: 'a', actionFields: [] })).toBeUndefined();
      });

      it('returns undefined when jsonBlob is null', () => {
        expect(extractConnectorIdFromJson({ jsonBlob: null })).toBeUndefined();
      });

      it('returns undefined when jsonBlob is invalid json', () => {
        expect(extractConnectorIdFromJson({ jsonBlob: 'a' })).toBeUndefined();
      });

      it('returns undefined when jsonBlob is not a valid connector', () => {
        expect(
          extractConnectorIdFromJson({
            action: 'create',
            actionFields: ['connector'],
            jsonBlob: JSON.stringify({ a: 'hello' }),
          })
        ).toBeUndefined();
      });

      it('returns stringified json without the id', () => {
        const jiraConnector = createJiraConnector();

        const { transformedJson } = extractConnectorIdFromJson({
          action: 'create',
          actionFields: ['connector'],
          jsonBlob: JSON.stringify(jiraConnector),
        })!;

        expect(JSON.parse(transformedJson)).toEqual({
          connector: {
            name: '.jira',
            type: '.jira',
            fields: { issueType: 'bug', priority: 'high', parent: '2' },
          },
        });
      });
    });
  });
});
