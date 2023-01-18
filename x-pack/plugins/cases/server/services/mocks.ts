/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  AlertService,
  CaseConfigureService,
  CasesService,
  CaseUserActionService,
  ConnectorMappingsService,
  AttachmentService,
} from '.';
import type { AttachmentGetter } from './attachments/operations/get';
import type { LicensingService } from './licensing';
import type { EmailNotificationService } from './notifications/email_notification_service';
import type { UserActionPersister } from './user_actions/operations/create';

interface AttachmentServiceOperations {
  getter: AttachmentGetterServiceMock;
}

export type AttachmentGetterServiceMock = jest.Mocked<AttachmentGetter>;

export type CaseServiceMock = jest.Mocked<CasesService>;
export type CaseConfigureServiceMock = jest.Mocked<CaseConfigureService>;
export type ConnectorMappingsServiceMock = jest.Mocked<ConnectorMappingsService>;
export type CaseUserActionServiceMock = jest.Mocked<CaseUserActionService>;
export type CaseUserActionPersisterServiceMock = jest.Mocked<UserActionPersister>;
export type AlertServiceMock = jest.Mocked<AlertService>;
export type AttachmentServiceMock = jest.Mocked<AttachmentService & AttachmentServiceOperations>;
export type LicensingServiceMock = jest.Mocked<LicensingService>;
export type NotificationServiceMock = jest.Mocked<EmailNotificationService>;

export const createCaseServiceMock = (): CaseServiceMock => {
  const service = {
    deleteCase: jest.fn(),
    findCases: jest.fn(),
    getAllCaseComments: jest.fn(),
    getCase: jest.fn(),
    getCases: jest.fn(),
    getCaseIdsByAlertId: jest.fn(),
    getResolveCase: jest.fn(),
    getTags: jest.fn(),
    getReporters: jest.fn(),
    postNewCase: jest.fn(),
    patchCase: jest.fn(),
    patchCases: jest.fn(),
    findCasesGroupedByID: jest.fn(),
    getCaseStatusStats: jest.fn(),
    executeAggregations: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return service as unknown as CaseServiceMock;
};

export const createConfigureServiceMock = (): CaseConfigureServiceMock => {
  const service: PublicMethodsOf<CaseConfigureService> = {
    delete: jest.fn(),
    get: jest.fn(),
    find: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return service as unknown as CaseConfigureServiceMock;
};

export const connectorMappingsServiceMock = (): ConnectorMappingsServiceMock => {
  const service: PublicMethodsOf<ConnectorMappingsService> = {
    find: jest.fn(),
    post: jest.fn(),
    update: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return service as unknown as ConnectorMappingsServiceMock;
};

const createUserActionPersisterServiceMock = (): CaseUserActionPersisterServiceMock => {
  const service: PublicMethodsOf<UserActionPersister> = {
    bulkAuditLogCaseDeletion: jest.fn(),
    bulkCreateUpdateCase: jest.fn(),
    bulkCreateAttachmentDeletion: jest.fn(),
    bulkCreateAttachmentCreation: jest.fn(),
    createUserAction: jest.fn(),
  };

  return service as unknown as CaseUserActionPersisterServiceMock;
};

type FakeUserActionService = PublicMethodsOf<CaseUserActionService> & {
  creator: CaseUserActionPersisterServiceMock;
};

export const createUserActionServiceMock = (): CaseUserActionServiceMock => {
  const service: FakeUserActionService = {
    creator: createUserActionPersisterServiceMock(),
    getConnectorFieldsBeforeLatestPush: jest.fn(),
    getMostRecentUserAction: jest.fn(),
    getCaseConnectorInformation: jest.fn(),
    getAll: jest.fn(),
    findStatusChanges: jest.fn(),
    getUniqueConnectors: jest.fn(),
    getUserActionIdsForCases: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return service as unknown as CaseUserActionServiceMock;
};

export const createAlertServiceMock = (): AlertServiceMock => {
  const service: PublicMethodsOf<AlertService> = {
    updateAlertsStatus: jest.fn(),
    getAlerts: jest.fn(),
    executeAggregations: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return service as unknown as AlertServiceMock;
};

const createAttachmentGetterServiceMock = (): AttachmentGetterServiceMock => {
  const service: PublicMethodsOf<AttachmentGetter> = {
    get: jest.fn(),
    getAllAlertsAttachToCase: jest.fn(),
    getCaseCommentStats: jest.fn(),
    getAttachmentIdsForCases: jest.fn(),
  };

  return service as unknown as AttachmentGetterServiceMock;
};

type FakeAttachmentService = PublicMethodsOf<AttachmentService> & AttachmentServiceOperations;

export const createAttachmentServiceMock = (): AttachmentServiceMock => {
  const service: FakeAttachmentService = {
    getter: createAttachmentGetterServiceMock(),
    delete: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
    update: jest.fn(),
    bulkUpdate: jest.fn(),
    find: jest.fn(),
    countAlertsAttachedToCase: jest.fn(),
    executeCaseActionsAggregations: jest.fn(),
    valueCountAlertsAttachedToCase: jest.fn(),
    executeCaseAggregations: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return service as unknown as AttachmentServiceMock;
};

export const createLicensingServiceMock = (): LicensingServiceMock => {
  const service: PublicMethodsOf<LicensingService> = {
    notifyUsage: jest.fn(),
    getLicenseInformation: jest.fn(),
    isAtLeast: jest.fn(),
    isAtLeastPlatinum: jest.fn().mockReturnValue(true),
    isAtLeastGold: jest.fn(),
    isAtLeastEnterprise: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return service as unknown as LicensingServiceMock;
};

export const createNotificationServiceMock = (): NotificationServiceMock => {
  const service: PublicMethodsOf<EmailNotificationService> = {
    notifyAssignees: jest.fn(),
    bulkNotifyAssignees: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return service as unknown as NotificationServiceMock;
};
