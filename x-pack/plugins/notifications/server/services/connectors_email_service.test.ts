/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unsecuredActionsClientMock } from '@kbn/actions-plugin/server/unsecured_actions_client/unsecured_actions_client.mock';
import { ConnectorsEmailService } from './connectors_email_service';
import type { PlainTextEmail } from './types';

const REQUESTER_ID = 'requesterId';
const CONNECTOR_ID = 'connectorId';

describe('sendPlainTextEmail()', () => {
  describe('calls the provided ActionsClient#bulkEnqueueExecution() with the appropriate params', () => {
    it(`omits the 'relatedSavedObjects' field if no context is provided`, () => {
      const actionsClient = unsecuredActionsClientMock.create();
      const email = new ConnectorsEmailService(REQUESTER_ID, CONNECTOR_ID, actionsClient);
      const payload: PlainTextEmail = {
        to: ['user1@email.com'],
        subject: 'This is a notification email',
        message: 'With some contents inside.',
      };

      email.sendPlainTextEmail(payload);

      expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
      expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledWith(REQUESTER_ID, [
        {
          id: CONNECTOR_ID,
          params: {
            to: ['user1@email.com'],
            subject: 'This is a notification email',
            message: 'With some contents inside.',
          },
        },
      ]);
    });

    it(`populates the 'relatedSavedObjects' field if context is provided`, () => {
      const actionsClient = unsecuredActionsClientMock.create();
      const email = new ConnectorsEmailService(REQUESTER_ID, CONNECTOR_ID, actionsClient);
      const payload: PlainTextEmail = {
        to: ['user1@email.com', 'user2@email.com', 'user3@email.com'],
        subject: 'This is a notification email',
        message: 'With some contents inside.',
        context: {
          relatedObjects: [
            {
              id: '9c9456a4-c160-46f5-96f7-e9ac734d0d9b',
              type: 'cases',
              namespace: 'space1',
            },
          ],
        },
      };

      email.sendPlainTextEmail(payload);

      expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
      expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledWith(REQUESTER_ID, [
        {
          id: CONNECTOR_ID,
          params: {
            to: ['user1@email.com'],
            subject: 'This is a notification email',
            message: 'With some contents inside.',
          },
          relatedSavedObjects: [
            {
              id: '9c9456a4-c160-46f5-96f7-e9ac734d0d9b',
              type: 'cases',
              namespace: 'space1',
            },
          ],
        },
        {
          id: CONNECTOR_ID,
          params: {
            to: ['user2@email.com'],
            subject: 'This is a notification email',
            message: 'With some contents inside.',
          },
          relatedSavedObjects: [
            {
              id: '9c9456a4-c160-46f5-96f7-e9ac734d0d9b',
              type: 'cases',
              namespace: 'space1',
            },
          ],
        },
        {
          id: CONNECTOR_ID,
          params: {
            to: ['user3@email.com'],
            subject: 'This is a notification email',
            message: 'With some contents inside.',
          },
          relatedSavedObjects: [
            {
              id: '9c9456a4-c160-46f5-96f7-e9ac734d0d9b',
              type: 'cases',
              namespace: 'space1',
            },
          ],
        },
      ]);
    });
  });
});
