/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isString } from 'lodash';
import { getExportType as getTypeCsv } from '../export_types/csv';
import { getExportType as getTypeCsvFromSavedObject } from '../export_types/csv_from_savedobject';
import { getExportType as getTypePng } from '../export_types/png';
import { getExportType as getTypePrintablePdf } from '../export_types/printable_pdf';
import { ExportTypeDefinition } from '../types';

type GetCallbackFn<JobParamsType, ScheduleTaskFnType, JobPayloadType, RunTaskFnType> = (
  item: ExportTypeDefinition<JobParamsType, ScheduleTaskFnType, JobPayloadType, ScheduleTaskFnType>
) => boolean;
// => ExportTypeDefinition<T, U, V, W>

export class ExportTypesRegistry {
  private _map: Map<string, ExportTypeDefinition<any, any, any, any>> = new Map();

  constructor() {}

  register<JobParamsType, ScheduleTaskFnType, JobPayloadType, RunTaskFnType>(
    item: ExportTypeDefinition<JobParamsType, ScheduleTaskFnType, JobPayloadType, RunTaskFnType>
  ): void {
    if (!isString(item.id)) {
      throw new Error(`'item' must have a String 'id' property `);
    }

    if (this._map.has(item.id)) {
      throw new Error(`'item' with id ${item.id} has already been registered`);
    }

    this._map.set(item.id, item);
  }

  getAll() {
    return Array.from(this._map.values());
  }

  getSize() {
    return this._map.size;
  }

  getById<JobParamsType, ScheduleTaskFnType, JobPayloadType, RunTaskFnType>(
    id: string
  ): ExportTypeDefinition<JobParamsType, ScheduleTaskFnType, JobPayloadType, RunTaskFnType> {
    if (!this._map.has(id)) {
      throw new Error(`Unknown id ${id}`);
    }

    return this._map.get(id) as ExportTypeDefinition<
      JobParamsType,
      ScheduleTaskFnType,
      JobPayloadType,
      RunTaskFnType
    >;
  }

  get<JobParamsType, ScheduleTaskFnType, JobPayloadType, RunTaskFnType>(
    findType: GetCallbackFn<JobParamsType, ScheduleTaskFnType, JobPayloadType, RunTaskFnType>
  ): ExportTypeDefinition<JobParamsType, ScheduleTaskFnType, JobPayloadType, RunTaskFnType> {
    let result;
    for (const value of this._map.values()) {
      if (!findType(value)) {
        continue; // try next value
      }
      const foundResult: ExportTypeDefinition<
        JobParamsType,
        ScheduleTaskFnType,
        JobPayloadType,
        RunTaskFnType
      > = value;

      if (result) {
        throw new Error('Found multiple items matching predicate.');
      }

      result = foundResult;
    }

    if (!result) {
      throw new Error('Found no items matching predicate');
    }

    return result;
  }
}

export function getExportTypesRegistry(): ExportTypesRegistry {
  const registry = new ExportTypesRegistry();

  /* this replaces the previously async method of registering export types,
   * where this would run a directory scan and types would be registered via
   * discovery */
  const getTypeFns: Array<() => ExportTypeDefinition<any, any, any, any>> = [
    getTypeCsv,
    getTypeCsvFromSavedObject,
    getTypePng,
    getTypePrintablePdf,
  ];
  getTypeFns.forEach((getType) => {
    registry.register(getType());
  });
  return registry;
}
