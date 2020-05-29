/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TimelineTypeLiteralWithNull,
  TimelineType,
  TimelineStatus,
  TimelineTypeLiteral,
} from '../../../../../common/types/timeline';
import { FrameworkRequest } from '../../../framework';

import { TimelineStatusActions, TimelineStatusAction } from './common';
import { TimelineObject } from './timeline_object';
import {
  checkIsCreateFailureCases,
  checkIsUpdateFailureCases,
  checkIsCreateViaImportFailureCases,
  commonFailureChecker,
} from './failure_cases';

interface GivenTimelineInput {
  id: string | null | undefined;
  type?: TimelineTypeLiteralWithNull;
  version: string | number | null | undefined;
}

interface TimelinesStatusProps {
  status: TimelineStatus | null | undefined;
  title: string | null | undefined;
  timelineType: TimelineTypeLiteralWithNull | undefined;
  timelineInput: GivenTimelineInput;
  templateTimelineInput: GivenTimelineInput;
  frameworkRequest: FrameworkRequest;
}

export class CompareTimelinesStatus {
  public readonly timelineObject: TimelineObject;
  public readonly templateTimelineObject: TimelineObject;
  private readonly timelineType: TimelineTypeLiteral;
  private readonly title: string | null;
  private readonly status: TimelineStatus;
  constructor({
    status = TimelineStatus.active,
    title,
    timelineType = TimelineType.default,
    timelineInput,
    templateTimelineInput,
    frameworkRequest,
  }: TimelinesStatusProps) {
    this.timelineObject = new TimelineObject({
      id: timelineInput.id,
      type: timelineInput.type ?? TimelineType.default,
      version: timelineInput.version,
      frameworkRequest,
    });

    this.templateTimelineObject = new TimelineObject({
      id: templateTimelineInput.id,
      type: templateTimelineInput.type ?? TimelineType.template,
      version: templateTimelineInput.version,
      frameworkRequest,
    });

    this.timelineType = timelineType ?? TimelineType.default;
    this.title = title ?? null;
    this.status = status ?? TimelineStatus.active;
  }

  public get isCreatable() {
    return (
      this.isTitleExists &&
      ((this.timelineObject.isCreatable && !this.isHandlingTemplateTimeline) ||
        (this.templateTimelineObject.isCreatable &&
          this.timelineObject.isCreatable &&
          this.isHandlingTemplateTimeline))
    );
  }

  public get isCreatableViaImport() {
    return this.isCreatable;
  }

  public get isUpdatable() {
    return (
      !this.isUpdatingImmutiableTimeline &&
      ((this.timelineObject.isUpdatable && !this.isHandlingTemplateTimeline) ||
        (this.templateTimelineObject.isUpdatable && this.isHandlingTemplateTimeline))
    );
  }

  public get isUpdatableViaImport() {
    return (
      !this.isUpdatingImmutiableTimeline &&
      ((this.timelineObject.isUpdatableViaImport && !this.isHandlingTemplateTimeline) ||
        (this.templateTimelineObject.isUpdatableViaImport && this.isHandlingTemplateTimeline))
    );
  }

  public get isTitleExists() {
    return this.title != null;
  }

  public getFailureChecker(action?: TimelineStatusAction) {
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
    const version = this.templateTimelineObject.getVersion;
    const commonError = commonFailureChecker(this.title);
    if (commonError != null) {
      return commonError;
    }
    const msg = failureChecker(
      this.isHandlingTemplateTimeline,
      this.status,
      this.timelineObject.getVersion?.toString() ?? null,
      version != null && typeof version === 'string' ? parseInt(version, 10) : version,
      this.timelineObject.getData,
      this.templateTimelineObject.getData
    );
    return msg;
  }

  public get templateTimelineInput() {
    return this.templateTimelineObject;
  }

  public get timelineInput() {
    return this.timelineObject;
  }

  private getTimelines() {
    return Promise.all([
      this.timelineObject.getTimeline(),
      this.templateTimelineObject.getTimeline(),
    ]);
  }

  public get isHandlingTemplateTimeline() {
    return this.timelineType === TimelineType.template;
  }

  private get isUpdatingImmutiableTimeline() {
    const obj = this.isHandlingTemplateTimeline ? this.templateTimelineObject : this.timelineObject;
    /*
     * Do not allow
     * 1. Existing timeline is immutiable
     * 2. Converting existing timeline's status
     */
    return (
      (obj.isExists && obj.getData?.status != null && this.status !== obj.getData?.status) ||
      (obj.isExists &&
        obj.getData?.status == null &&
        this.status !== TimelineStatus.active &&
        this.status != null)
    );
  }

  public async init() {
    await this.getTimelines();
  }
}
