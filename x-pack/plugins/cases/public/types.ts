/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { ReactElement } from 'react';
import type React from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ManagementSetup, ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { FeaturesPluginStart } from '@kbn/features-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart as TriggersActionsStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { DistributiveOmit } from '@elastic/eui';
import type { ApmBase } from '@elastic/apm-rum';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { FilesSetup, FilesStart } from '@kbn/files-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';

import type { UseCasesAddToExistingCaseModal } from './components/all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import type { UseCasesAddToNewCaseFlyout } from './components/create/flyout/use_cases_add_to_new_case_flyout';
import type { canUseCases } from './client/helpers/can_use_cases';
import type { getRuleIdFromEvent } from './client/helpers/get_rule_id_from_event';
import type { GetCasesContextProps } from './client/ui/get_cases_context';
import type { GetCasesProps } from './client/ui/get_cases';
import type { GetAllCasesSelectorModalProps } from './client/ui/get_all_cases_selector_modal';
import type { GetRecentCasesProps } from './client/ui/get_recent_cases';
import type { CasesStatus, CasesMetrics, CasesFindResponseUI } from '../common/ui';
import type { GroupAlertsByRule } from './client/helpers/group_alerts_by_rule';
import type { getUICapabilities } from './client/helpers/capabilities';
import type { AttachmentFramework } from './client/attachment_framework/types';
import type { ExternalReferenceAttachmentTypeRegistry } from './client/attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from './client/attachment_framework/persistable_state_registry';
import type {
  CasesByAlertIDRequest,
  GetRelatedCasesByAlertResponse,
  CasesFindRequest,
  CasesStatusRequest,
  CasesBulkGetRequest,
  CasesBulkGetResponse,
  CasesMetricsRequest,
} from '../common/types/api';
import type {
  AlertAttachmentPayload,
  UserCommentAttachmentPayload,
  PersistableStateAttachmentPayload,
  ExternalReferenceNoSOAttachmentPayload,
  ExternalReferenceSOAttachmentPayload,
} from '../common/types/domain';

export interface CasesPluginSetup {
  files: FilesSetup;
  security: SecurityPluginSetup;
  serverless?: ServerlessPluginSetup;
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
}

export interface CasesPluginStart {
  apm?: ApmBase;
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  features: FeaturesPluginStart;
  files: FilesStart;
  lens: LensPublicStart;
  licensing?: LicensingPluginStart;
  contentManagement: ContentManagementPublicStart;
  security: SecurityPluginStart;
  serverless?: ServerlessPluginStart;
  spaces?: SpacesPluginStart;
  storage: Storage;
  triggersActionsUi: TriggersActionsStart;
  uiActions: UiActionsStart;
}

/**
 * TODO: The extra security service is one that should be implemented in the kibana context of the consuming application.
 * Security is needed for access to authc for the `useCurrentUser` hook. Security_Solution currently passes it via renderApp in public/plugin.tsx
 * Leaving it out currently in lieu of RBAC changes
 */

export type StartServices = CoreStart & CasesPluginStart;

export interface RenderAppProps {
  mountParams: ManagementAppMountParams;
  coreStart: CoreStart;
  pluginsStart: CasesPluginStart;
  storage: Storage;
  kibanaVersion: string;
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
}

export interface CasesUiSetup {
  attachmentFramework: AttachmentFramework;
}

export interface CasesUiStart {
  api: {
    getRelatedCases: (
      alertId: string,
      query: CasesByAlertIDRequest
    ) => Promise<GetRelatedCasesByAlertResponse>;
    cases: {
      find: (query: CasesFindRequest, signal?: AbortSignal) => Promise<CasesFindResponseUI>;
      getCasesStatus: (query: CasesStatusRequest, signal?: AbortSignal) => Promise<CasesStatus>;
      getCasesMetrics: (query: CasesMetricsRequest, signal?: AbortSignal) => Promise<CasesMetrics>;
      bulkGet: (params: CasesBulkGetRequest, signal?: AbortSignal) => Promise<CasesBulkGetResponse>;
    };
  };
  ui: {
    /**
     * Get cases
     * @param props GetCasesProps
     * @return {ReactElement<GetCasesProps>}
     */
    getCases: (props: GetCasesProps) => ReactElement<GetCasesProps>;
    getCasesContext: () => React.FC<GetCasesContextProps>;

    /**
     * Modal to select a case in a list of all owner cases
     * @param props GetAllCasesSelectorModalProps
     * @returns A react component that is a modal for selecting a case
     */
    getAllCasesSelectorModal: (
      props: GetAllCasesSelectorModalProps
    ) => ReactElement<GetAllCasesSelectorModalProps>;
    /**
     * Get the recent cases component
     * @param props GetRecentCasesProps
     * @returns A react component for showing recent cases
     */
    getRecentCases: (props: GetRecentCasesProps) => ReactElement<GetRecentCasesProps>;
  };
  hooks: {
    useCasesAddToNewCaseFlyout: UseCasesAddToNewCaseFlyout;
    useCasesAddToExistingCaseModal: UseCasesAddToExistingCaseModal;
  };
  helpers: {
    /**
     * Returns an object denoting the current user's ability to read and crud cases.
     * If any owner(securitySolution, Observability) is found with crud or read capability respectively,
     * then crud or read is set to true.
     * Permissions for specific owners can be found by passing an owner array
     * @param owners an array of CaseOwners that should be queried for permission
     * @returns An object denoting the case permissions of the current user
     */
    canUseCases: ReturnType<typeof canUseCases>;
    getUICapabilities: typeof getUICapabilities;
    getRuleIdFromEvent: typeof getRuleIdFromEvent;
    groupAlertsByRule: GroupAlertsByRule;
  };
}

export type SupportedCaseAttachment =
  | AlertAttachmentPayload
  | UserCommentAttachmentPayload
  | PersistableStateAttachmentPayload
  | ExternalReferenceNoSOAttachmentPayload
  | ExternalReferenceSOAttachmentPayload;

export type CaseAttachments = SupportedCaseAttachment[];
export type CaseAttachmentWithoutOwner = DistributiveOmit<SupportedCaseAttachment, 'owner'>;
export type CaseAttachmentsWithoutOwner = CaseAttachmentWithoutOwner[];

export type ServerError = IHttpFetchError<ResponseErrorBody>;
