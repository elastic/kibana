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

export class TimelineInput {
  id: string | null;
  type: TimelineTypeLiteralWithNull;
  version: string | number | null;
  frameworkRequest: FrameworkRequest;
  data: TimelineSavedObject | null;
  exists: boolean;
  creatable: boolean;
  updatable: boolean;
  allowUpdateViaImport: boolean;
  versionConflict: boolean;

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
    this.exists = false;
    this.creatable = false;
    this.updatable = false;
    this.allowUpdateViaImport = false;
    this.versionConflict = false;
  }

  async getTimelines() {
    this.data =
      this.id != null
        ? this.type === TimelineType.template
          ? await getTemplateTimeline(this.frameworkRequest, this.id)
          : await getTimeline(this.frameworkRequest, this.id)
        : null;

    this.exists = this.id != null && this.data != null;
    this.checkIfVersionConflict();
    this.creatable = !this.exists;
    this.updatable = this.id != null && this.exists && !this.versionConflict;
    this.allowUpdateViaImport = this.type === TimelineType.template && this.updatable;
  }

  public checkIfVersionConflict() {
    let isVersionConflict = false;
    const existingVersion =
      this.type === TimelineType.template ? this.data?.templateTimelineVersion : this.data?.version;
    if (this.exists && this.version != null) {
      isVersionConflict = !(this.version === existingVersion);
    } else if (this.exists && this.version == null) {
      isVersionConflict = true;
    }
    this.versionConflict = isVersionConflict;
  }
}
