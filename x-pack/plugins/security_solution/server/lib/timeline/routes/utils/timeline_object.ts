/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  TimelineType,
  TimelineTypeLiteral,
  TimelineSavedObject,
  TimelineStatus,
} from '../../../../../common/types/timeline';
import { getTimeline, getTemplateTimeline } from './create_timelines';
import { FrameworkRequest } from '../../../framework';

interface TimelineObjectProps {
  id: string | null | undefined;
  type: TimelineTypeLiteral;
  version: string | number | null | undefined;
  frameworkRequest: FrameworkRequest;
}

export class TimelineObject {
  public readonly id: string | null;
  private type: TimelineTypeLiteral;
  public readonly version: string | number | null;
  private frameworkRequest: FrameworkRequest;

  public data: TimelineSavedObject | null;

  constructor({
    id = null,
    type = TimelineType.default,
    version = null,
    frameworkRequest,
  }: TimelineObjectProps) {
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

  public get getData() {
    return this.data;
  }

  private get isImmutable() {
    return this.data?.status === TimelineStatus.immutable;
  }

  public get isExists() {
    return this.data != null;
  }

  public get isUpdatable() {
    return this.isExists && !this.isImmutable;
  }

  public get isCreatable() {
    return !this.isExists;
  }

  public get isUpdatableViaImport() {
    return this.type === TimelineType.template && this.isExists;
  }

  public get getVersion() {
    return this.version;
  }

  public get getId() {
    return this.id;
  }
}
