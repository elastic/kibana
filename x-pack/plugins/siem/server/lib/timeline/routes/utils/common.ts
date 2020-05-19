/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set } from 'lodash/fp';

import { KibanaRequest, KibanaRequest } from 'src/core/server';
import { RequestHandlerContext } from '../../../../../../../../target/types/core/server';

import { TimelineTypeLiteralWithNull, TimelineType } from '../../../../../common/types/timeline';
import { SetupPlugins } from '../../../../plugin';

import { FrameworkRequest } from '../../../framework';

import { TimelineObject } from './timeline_input';
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
  public timelineObject: TimelineObject;
  public templateTimelineObject: TimelineObject;
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
    this.timelineObject = new TimelineObject({
      id: timelineInput.id,
      type: timelineInput.type,
      version: timelineInput.version,
      frameworkRequest,
    });

    this.templateTimelineObject = new TimelineObject({
      id: templateTimelineInput.id,
      type: templateTimelineInput.type,
      version: templateTimelineInput.version,
      frameworkRequest,
    });

    this.timelineType = timelineType ?? TimelineType.default;
  }

  private isCreatable() {
    return (
      (this.timelineObject.isCreatable() && !this.isHandlingTemplateTimeline()) ||
      (this.templateTimelineObject.isCreatable() &&
        this.timelineObject.isCreatable() &&
        this.isHandlingTemplateTimeline())
    );
  }

  private isCreatableViaImport() {
    return this.isCreatable();
  }

  private isUpdatable() {
    return (
      (this.timelineObject.isUpdatable() && !this.isHandlingTemplateTimeline()) ||
      (this.templateTimelineObject.isUpdatable() && this.isHandlingTemplateTimeline())
    );
  }

  private isUpdatableViaImport() {
    return (
      (this.timelineObject.isUpdatableViaImport() && !this.isHandlingTemplateTimeline()) ||
      (this.templateTimelineObject.isUpdatableViaImport() && this.isHandlingTemplateTimeline())
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
    const version = this.templateTimelineObject.getVersion();
    return failureChecker(
      this.isHandlingTemplateTimeline(),
      this.timelineObject.getVersion()?.toString() ?? null,
      version != null && typeof version === 'string' ? parseInt(version, 10) : version,
      this.timelineObject.data,
      this.templateTimelineObject.data
    );
  }

  public getTemplateTimelineInput() {
    return this.templateTimelineObject;
  }

  public getTimelineInput() {
    return this.timelineObject;
  }

  private getTimelines() {
    // console.log('getTimelines');
    return Promise.all([
      this.timelineObject.getTimeline(),
      this.templateTimelineObject.getTimeline(),
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
