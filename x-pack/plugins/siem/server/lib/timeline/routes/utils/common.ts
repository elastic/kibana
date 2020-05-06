/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set } from 'lodash/fp';

import { KibanaRequest } from '../../../../../../../../src/core/server';
import { RequestHandlerContext } from '../../../../../../../../target/types/core/server';

import { TimelineTypeLiteralWithNull, TimelineType } from '../../../../../common/types/timeline';
import { SetupPlugins } from '../../../../plugin';

import { FrameworkRequest } from '../../../framework';

import { TimelineInput } from './timeline_input';
import {
  checkIsCreateFailureCases,
  checkIsUpdateFailureCases,
  checkIsCreateViaImportFailureCases,
} from './failure_cases';

export const buildFrameworkRequest = async (
  context: RequestHandlerContext,
  security: SetupPlugins['security'],
  request: KibanaRequest
): Promise<FrameworkRequest> => {
  const savedObjectsClient = context.core.savedObjects.client;
  const user = await security?.authc.getCurrentUser(request);

  return set<FrameworkRequest>(
    'user',
    user,
    set<KibanaRequest & { context: RequestHandlerContext }>(
      'context.core.savedObjects.client',
      savedObjectsClient,
      request
    )
  );
};

interface GivenTimelineInput {
  id: string | null;
  type: TimelineTypeLiteralWithNull;
  version: string | number | null;
}

export enum TimelineStatusActions {
  create = 'create',
  createViaImport = 'createViaImport',
  update = 'update',
  updateViaImport = 'updateViaImport',
}

export type TimelineStatusAction =
  | TimelineStatusActions.create
  | TimelineStatusActions.createViaImport
  | TimelineStatusActions.update
  | TimelineStatusActions.updateViaImport;

export class TimelinesStatus {
  timelineInput: TimelineInput;
  templateTimelineInput: TimelineInput;
  isHandlingTemplateTimeline: boolean;
  isCreatable: boolean;
  isCreatableViaImport: boolean;
  isUpdatable: boolean;
  isUpdatableViaImport: boolean;
  errorMessage: { body: string; statusCode: number } | null;

  constructor({
    timelineType = TimelineType.default,
    timelineInput,
    templateTimelineInput,
    frameworkRequest,
  }: {
    timelineType: TimelineTypeLiteralWithNull;
    timelineInput: GivenTimelineInput;
    templateTimelineInput: GivenTimelineInput;
    frameworkRequest: FrameworkRequest;
  }) {
    this.timelineInput = new TimelineInput({
      id: timelineInput.id,
      type: timelineInput.type,
      version: timelineInput.version,
      frameworkRequest,
    });

    this.templateTimelineInput = new TimelineInput({
      id: templateTimelineInput.id,
      type: templateTimelineInput.type,
      version: templateTimelineInput.version,
      frameworkRequest,
    });

    this.isHandlingTemplateTimeline = timelineType === TimelineType.template;
    this.errorMessage = null;

    this.isCreatable = true;
    this.isCreatableViaImport = false;
    this.isUpdatable = true;
    this.isUpdatableViaImport = false;
  }

  private setIsCreatable() {
    this.isCreatable =
      (this.timelineInput.creatable && !this.isHandlingTemplateTimeline) ||
      (this.templateTimelineInput.creatable &&
        this.timelineInput.creatable &&
        this.isHandlingTemplateTimeline);
  }

  private setIsCreatableViaImport() {
    this.isCreatableViaImport = this.isCreatable;
  }

  private setIsUpdatable() {
    this.isUpdatable =
      (this.timelineInput.updatable && !this.isHandlingTemplateTimeline) ||
      (this.templateTimelineInput.updatable && this.isHandlingTemplateTimeline);
  }

  private setIsUpdatableViaImport() {
    this.isUpdatableViaImport =
      (this.timelineInput.allowUpdateViaImport && !this.isHandlingTemplateTimeline) ||
      (this.templateTimelineInput.allowUpdateViaImport && this.isHandlingTemplateTimeline);
  }

  private getFailureChecker(action?: TimelineStatusAction) {
    if (action === TimelineStatusActions.create) {
      return checkIsCreateFailureCases;
    } else if (action === TimelineStatusActions.createViaImport) {
      return checkIsCreateViaImportFailureCases;
    } else {
      return checkIsUpdateFailureCases;
    }
  }

  public checkIsFailureCases(action?: TimelineStatusAction) {
    const failureChecker = this.getFailureChecker(action);
    this.errorMessage = failureChecker(
      this.isHandlingTemplateTimeline,
      this.timelineInput.version?.toString() ?? null,
      this.templateTimelineInput.version != null &&
        typeof this.templateTimelineInput.version === 'string'
        ? parseInt(this.templateTimelineInput.version, 10)
        : this.templateTimelineInput.version,
      this.timelineInput.data,
      this.templateTimelineInput.data
    );
    return this.errorMessage;
  }

  getTimelines() {
    return Promise.all([
      this.timelineInput.getTimelines(),
      this.templateTimelineInput.getTimelines(),
    ]);
  }

  public async setAvailableActions() {
    await this.getTimelines();

    this.setIsCreatable();
    this.setIsCreatableViaImport();
    this.setIsUpdatable();
    this.setIsUpdatableViaImport();
  }
}
