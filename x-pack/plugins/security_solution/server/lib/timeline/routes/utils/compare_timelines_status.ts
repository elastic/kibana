/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEmpty } from 'lodash/fp';
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
  checkIsUpdateViaImportFailureCases,
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
      this.isTitleValid &&
      !this.isSavedObjectVersionConflict &&
      ((this.timelineObject.isCreatable && !this.isHandlingTemplateTimeline) ||
        (this.templateTimelineObject.isCreatable &&
          this.timelineObject.isCreatable &&
          this.isHandlingTemplateTimeline))
    );
  }

  public get isCreatableViaImport() {
    return (
      this.isCreatedStatusValid &&
      ((this.isCreatable && !this.isHandlingTemplateTimeline) ||
        (this.isCreatable && this.isHandlingTemplateTimeline && this.isTemplateVersionValid))
    );
  }

  private get isCreatedStatusValid() {
    const obj = this.isHandlingTemplateTimeline ? this.templateTimelineObject : this.timelineObject;

    return obj.isExists
      ? this.status === obj.getData?.status && this.status !== TimelineStatus.draft
      : this.status !== TimelineStatus.draft;
  }

  public get isUpdatable() {
    return (
      this.isTitleValid &&
      !this.isSavedObjectVersionConflict &&
      ((this.timelineObject.isUpdatable && !this.isHandlingTemplateTimeline) ||
        (this.templateTimelineObject.isUpdatable && this.isHandlingTemplateTimeline))
    );
  }

  private get isTimelineTypeValid() {
    const obj = this.isHandlingTemplateTimeline ? this.templateTimelineObject : this.timelineObject;
    const existintTimelineType = obj.getData?.timelineType ?? TimelineType.default;
    return obj.isExists ? this.timelineType === existintTimelineType : true;
  }

  public get isUpdatableViaImport() {
    return (
      this.isTimelineTypeValid &&
      this.isTitleValid &&
      this.isUpdatedTimelineStatusValid &&
      (this.timelineObject.isUpdatableViaImport ||
        (this.templateTimelineObject.isUpdatableViaImport &&
          this.isTemplateVersionValid &&
          this.isHandlingTemplateTimeline))
    );
  }

  public get isTitleValid() {
    return (
      (this.status !== TimelineStatus.draft && !isEmpty(this.title)) ||
      this.status === TimelineStatus.draft
    );
  }

  public getFailureChecker(action?: TimelineStatusAction) {
    if (action === TimelineStatusActions.create) {
      return checkIsCreateFailureCases;
    } else if (action === TimelineStatusActions.createViaImport) {
      return checkIsCreateViaImportFailureCases;
    } else if (action === TimelineStatusActions.update) {
      return checkIsUpdateFailureCases;
    } else {
      return checkIsUpdateViaImportFailureCases;
    }
  }

  public checkIsFailureCases(action?: TimelineStatusAction) {
    const failureChecker = this.getFailureChecker(action);
    const version = this.templateTimelineObject.getVersion;
    const commonError = commonFailureChecker(this.status, this.title);
    if (commonError != null) {
      return commonError;
    }

    const msg = failureChecker(
      this.isHandlingTemplateTimeline,
      this.status,
      this.timelineType,
      this.timelineObject.getVersion?.toString() ?? null,
      version != null && typeof version === 'string' ? parseInt(version, 10) : version,
      this.templateTimelineObject.getId,
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

  private get isSavedObjectVersionConflict() {
    const version = this.timelineObject?.getVersion;
    const existingVersion = this.timelineObject?.data?.version;
    if (version != null && this.timelineObject.isExists) {
      return version !== existingVersion;
    } else if (this.timelineObject.isExists && version == null) {
      return true;
    }
    return false;
  }

  private get isTemplateVersionConflict() {
    const version = this.templateTimelineObject?.getVersion;
    const existingTemplateTimelineVersion = this.templateTimelineObject?.data
      ?.templateTimelineVersion;
    if (
      version != null &&
      this.templateTimelineObject.isExists &&
      existingTemplateTimelineVersion != null
    ) {
      return version <= existingTemplateTimelineVersion;
    } else if (this.templateTimelineObject.isExists && version == null) {
      return true;
    }
    return false;
  }

  private get isTemplateVersionValid() {
    const version = this.templateTimelineObject?.getVersion;
    return typeof version === 'number' && !this.isTemplateVersionConflict;
  }

  private get isUpdatedTimelineStatusValid() {
    const status = this.status;
    const existingStatus = this.isHandlingTemplateTimeline
      ? this.templateTimelineInput.data?.status
      : this.timelineInput.data?.status;
    return (
      ((existingStatus == null || existingStatus === TimelineStatus.active) &&
        (status == null || status === TimelineStatus.active)) ||
      (existingStatus != null && status === existingStatus)
    );
  }

  public get timelineId() {
    if (this.isHandlingTemplateTimeline) {
      return this.templateTimelineInput.data?.savedObjectId ?? this.templateTimelineInput.getId;
    }
    return this.timelineInput.data?.savedObjectId ?? this.timelineInput.getId;
  }

  public get timelineVersion() {
    const version = this.isHandlingTemplateTimeline
      ? this.templateTimelineInput.data?.version ?? this.timelineInput.getVersion
      : this.timelineInput.data?.version ?? this.timelineInput.getVersion;
    return version != null ? version.toString() : null;
  }

  public async init() {
    await this.getTimelines();
  }
}
