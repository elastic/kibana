/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMockArgs } from '../../client/mocks';
import { userProfiles } from '../../client/user_profiles.mock';
import { mockCases } from '../../mocks';
import { EmailNotificationService } from './email_notification_service';

describe('EmailNotificationService', () => {
  const clientArgs = createCasesClientMockArgs();
  const sendPlainTextEmail = jest.fn();
  const isEmailServiceAvailable = jest.fn();
  const caseSO = mockCases[0];
  const assignees = userProfiles.map((userProfile) => ({ uid: userProfile.uid }));

  const notifications = {
    isEmailServiceAvailable,
    getEmailService: () => ({
      sendPlainTextEmail,
    }),
  };

  let emailNotificationService: EmailNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    isEmailServiceAvailable.mockReturnValue(true);
    clientArgs.securityStartPlugin.userProfiles.bulkGet.mockResolvedValue(userProfiles);

    emailNotificationService = new EmailNotificationService({
      logger: clientArgs.logger,
      security: clientArgs.securityStartPlugin,
      publicBaseUrl: 'https://example.com',
      notifications,
    });
  });

  it('notifies assignees', async () => {
    await emailNotificationService.notifyAssignees({
      assignees,
      theCase: caseSO,
    });

    expect(sendPlainTextEmail).toHaveBeenCalledWith({
      context: {
        relatedObjects: [
          {
            id: 'mock-id-1',
            namespace: undefined,
            type: 'cases',
          },
        ],
      },
      message:
        'You got assigned to case "Super Bad Security Issue". [View case](https://example.com/app/security/cases/mock-id-1).',
      subject: 'You got assigned to case "Super Bad Security Issue"',
      to: ['damaged_raccoon@elastic.co', 'physical_dinosaur@elastic.co', 'wet_dingo@elastic.co'],
    });
  });

  it('filters out duplicates assignees', async () => {
    await emailNotificationService.notifyAssignees({
      assignees: [...assignees, { uid: assignees[0].uid }],
      theCase: caseSO,
    });

    expect(sendPlainTextEmail).toHaveBeenCalledWith({
      context: {
        relatedObjects: [
          {
            id: 'mock-id-1',
            namespace: undefined,
            type: 'cases',
          },
        ],
      },
      message:
        'You got assigned to case "Super Bad Security Issue". [View case](https://example.com/app/security/cases/mock-id-1).',
      subject: 'You got assigned to case "Super Bad Security Issue"',
      to: ['damaged_raccoon@elastic.co', 'physical_dinosaur@elastic.co', 'wet_dingo@elastic.co'],
    });
  });

  it('filters out assignees without email', async () => {
    clientArgs.securityStartPlugin.userProfiles.bulkGet.mockResolvedValue([
      { ...userProfiles[0], user: { ...userProfiles[0].user, email: undefined } },
      { ...userProfiles[1] },
    ]);

    await emailNotificationService.notifyAssignees({
      assignees: [...assignees, { uid: assignees[0].uid }],
      theCase: caseSO,
    });

    expect(sendPlainTextEmail).toHaveBeenCalledWith({
      context: {
        relatedObjects: [
          {
            id: 'mock-id-1',
            namespace: undefined,
            type: 'cases',
          },
        ],
      },
      message:
        'You got assigned to case "Super Bad Security Issue". [View case](https://example.com/app/security/cases/mock-id-1).',
      subject: 'You got assigned to case "Super Bad Security Issue"',
      to: ['physical_dinosaur@elastic.co'],
    });
  });

  it('passes the namespace correctly', async () => {
    await emailNotificationService.notifyAssignees({
      assignees,
      theCase: { ...caseSO, namespaces: ['space1'] },
    });

    expect(sendPlainTextEmail).toHaveBeenCalledWith({
      context: {
        relatedObjects: [
          {
            id: 'mock-id-1',
            namespace: 'space1',
            type: 'cases',
          },
        ],
      },
      message:
        'You got assigned to case "Super Bad Security Issue". [View case](https://example.com/app/security/cases/mock-id-1).',
      subject: 'You got assigned to case "Super Bad Security Issue"',
      to: ['damaged_raccoon@elastic.co', 'physical_dinosaur@elastic.co', 'wet_dingo@elastic.co'],
    });
  });

  it('logs a warning and not notify assignees when the email service is not available', async () => {
    isEmailServiceAvailable.mockReturnValue(false);

    await emailNotificationService.notifyAssignees({
      assignees,
      theCase: caseSO,
    });

    expect(clientArgs.logger.warn).toHaveBeenCalledWith(
      'Could not notifying assignees. Email service is not available.'
    );
    expect(sendPlainTextEmail).not.toHaveBeenCalled();
  });

  it('logs a warning and not notify assignees on error', async () => {
    clientArgs.securityStartPlugin.userProfiles.bulkGet.mockRejectedValue(
      new Error('Cannot get user profiles')
    );

    await emailNotificationService.notifyAssignees({
      assignees,
      theCase: caseSO,
    });

    expect(clientArgs.logger.warn).toHaveBeenCalledWith(
      'Error notifying assignees: Cannot get user profiles'
    );
    expect(sendPlainTextEmail).not.toHaveBeenCalled();
  });
});
