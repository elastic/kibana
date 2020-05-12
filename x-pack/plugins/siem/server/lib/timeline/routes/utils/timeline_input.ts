/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  TimelineType,
  TimelineTypeLiteralWithNull,
  TimelineSavedObject,
} from '../../../../../common/types/timeline';
import { getTimeline, getTemplateTimeline } from './create_timelines';
import { FrameworkRequest } from '../../../framework';

export class TimelineObject {
  private id: string | null;
  private type: TimelineTypeLiteralWithNull;
  private version: string | number | null;
  private frameworkRequest: FrameworkRequest;

  public data: TimelineSavedObject | null;

  constructor({
    id,
    type = TimelineType.default,
    version,
    frameworkRequest,
  }: {
    id: string | null;
    type: TimelineTypeLiteralWithNull;
    version: string | number | null;
    frameworkRequest: FrameworkRequest;
  }) {
    this.id = id;
    this.type = type;

    this.version = version;
    this.frameworkRequest = frameworkRequest;
    this.data = null;
  }

  public async getTimeline() {
    this.data =
      this.id != null
        ? this.type === TimelineType.template
          ? await getTemplateTimeline(this.frameworkRequest, this.id)
          : await getTimeline(this.frameworkRequest, this.id)
        : null;

    return this.data;
  }

  public isExists() {
    return this.id != null && this.data != null;
  }

  public isUpdatable() {
    return this.id != null && this.isExists() && !this.isVersionConflict();
  }

  public isCreatable() {
    return !this.isExists();
  }

  public isUpdatableViaImport() {
    return this.type === TimelineType.template && this.isUpdatable();
  }

  public getVersion() {
    return this.version;
  }

  private isVersionConflict() {
    let isVersionConflict = false;
    const existingVersion =
      this.type === TimelineType.template ? this.data?.templateTimelineVersion : this.data?.version;
    if (this.isExists() && this.version != null) {
      isVersionConflict = !(this.version === existingVersion);
    } else if (this.isExists() && this.version == null) {
      isVersionConflict = true;
    }
    return isVersionConflict;
  }
}
