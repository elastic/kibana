/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISavedObjectsRepository } from 'src/core/server';
import { SPACES_TELEMETRY_TYPE } from '../../constants';
import { CopyOptions, ResolveConflictsOptions } from '../copy_to_spaces/types';
import { SpacesTelemetry, BooleanCount } from '../../model/spaces_telemetry';

type IncrementCopySavedObjectsOptions = Pick<CopyOptions, 'createNewCopies' | 'overwrite'>;
type IncrementResolveCopySavedObjectsErrorsOptions = Pick<
  ResolveConflictsOptions,
  'createNewCopies'
>;

const COPY_DEFAULT = Object.freeze({
  total: 0,
  createNewCopies: Object.freeze({ enabled: 0, disabled: 0 }),
  overwrite: Object.freeze({ enabled: 0, disabled: 0 }),
});
const RESOLVE_COPY_ERRORS_DEFAULT = Object.freeze({
  total: 0,
  createNewCopies: Object.freeze({ enabled: 0, disabled: 0 }),
});

export class TelemetryClient {
  constructor(
    private readonly debugLogger: (message: string) => void,
    private readonly repository: ISavedObjectsRepository
  ) {}

  public async getTelemetryData() {
    this.debugLogger('getTelemetryData() called');
    let spacesTelemetry: SpacesTelemetry = {};
    try {
      const result = await this.repository.get<SpacesTelemetry>(
        SPACES_TELEMETRY_TYPE,
        SPACES_TELEMETRY_TYPE
      );
      spacesTelemetry = result.attributes;
    } catch (err) {
      // do nothing
    }
    return spacesTelemetry;
  }

  public async incrementCopySavedObjects({
    createNewCopies,
    overwrite,
  }: IncrementCopySavedObjectsOptions) {
    const spacesTelemetry = await this.getTelemetryData();
    const { apiCalls = {} } = spacesTelemetry;
    const { copySavedObjects: current = COPY_DEFAULT } = apiCalls;

    const attributes = {
      ...spacesTelemetry,
      apiCalls: {
        ...apiCalls,
        copySavedObjects: {
          total: current.total + 1,
          createNewCopies: incrementBooleanCount(current.createNewCopies, createNewCopies),
          overwrite: incrementBooleanCount(current.overwrite, overwrite),
        },
      },
    };
    await this.updateTelemetryData(attributes);
  }

  public async incrementResolveCopySavedObjectsErrors({
    createNewCopies,
  }: IncrementResolveCopySavedObjectsErrorsOptions) {
    const spacesTelemetry = await this.getTelemetryData();
    const { apiCalls = {} } = spacesTelemetry;
    const { resolveCopySavedObjectsErrors: current = RESOLVE_COPY_ERRORS_DEFAULT } = apiCalls;

    const attributes = {
      ...spacesTelemetry,
      apiCalls: {
        ...apiCalls,
        resolveCopySavedObjectsErrors: {
          total: current.total + 1,
          createNewCopies: incrementBooleanCount(current.createNewCopies, createNewCopies),
        },
      },
    };
    await this.updateTelemetryData(attributes);
  }

  private async updateTelemetryData(attributes: SpacesTelemetry) {
    const options = { id: SPACES_TELEMETRY_TYPE, overwrite: true };
    return this.repository.create(SPACES_TELEMETRY_TYPE, attributes, options);
  }
}

function incrementBooleanCount(current: BooleanCount, value: boolean) {
  return {
    enabled: current.enabled + (value ? 1 : 0),
    disabled: current.disabled + (value ? 0 : 1),
  };
}
