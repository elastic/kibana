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
  public timelineInput: TimelineInput;
  public templateTimelineInput: TimelineInput;
  private timelineType: TimelineTypeLiteralWithNull;

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

    this.timelineType = timelineType ?? TimelineType.default;
  }

  private isCreatable() {
    return (
      (this.timelineInput.isCreatable() && !this.isHandlingTemplateTimeline()) ||
      (this.templateTimelineInput.isCreatable() &&
        this.timelineInput.isCreatable() &&
        this.isHandlingTemplateTimeline())
    );
  }

  private isCreatableViaImport() {
    return this.isCreatable();
  }

  private isUpdatable() {
    return (
      (this.timelineInput.isUpdatable() && !this.isHandlingTemplateTimeline()) ||
      (this.templateTimelineInput.isUpdatable() && this.isHandlingTemplateTimeline())
    );
  }

  private isUpdatableViaImport() {
    return (
      (this.timelineInput.isUpdatableViaImport() && !this.isHandlingTemplateTimeline()) ||
      (this.templateTimelineInput.isUpdatableViaImport() && this.isHandlingTemplateTimeline())
    );
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
    const version = this.templateTimelineInput.getVersion();
    return failureChecker(
      this.isHandlingTemplateTimeline(),
      this.timelineInput.getVersion()?.toString() ?? null,
      version != null && typeof version === 'string' ? parseInt(version, 10) : version,
      this.timelineInput.data,
      this.templateTimelineInput.data
    );
  }

  public getTemplateTimelineInput() {
    return this.templateTimelineInput;
  }

  public getTimelineInput() {
    return this.timelineInput;
  }

  private getTimelines() {
    return Promise.all([
      this.timelineInput.getTimelines(),
      this.templateTimelineInput.getTimelines(),
    ]);
  }

  public isHandlingTemplateTimeline() {
    return this.timelineType === TimelineType.template;
  }

  public async init() {
    await this.getTimelines();
    return {
      isCreatable: this.isCreatable(),
      isCreatableViaImport: this.isCreatableViaImport(),
      isUpdatable: this.isUpdatable(),
      isUpdatableViaImport: this.isUpdatableViaImport(),
      isHandlingTemplateTimeline: this.isHandlingTemplateTimeline(),
    };
  }
}
