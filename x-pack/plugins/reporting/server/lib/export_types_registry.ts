/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';
import { getExportType as getTypeCsvFromSavedObject } from '../export_types/csv_searchsource_immediate';
import { getExportType as getTypeCsv } from '../export_types/csv_searchsource';
import { getExportType as getTypePng } from '../export_types/png';
import { getExportType as getTypePngV2 } from '../export_types/png_v2';
import { getExportType as getTypePrintablePdf } from '../export_types/printable_pdf';
import { getExportType as getTypePrintablePdfV2 } from '../export_types/printable_pdf_v2';

import { CreateJobFn, ExportTypeDefinition } from '../types';

type GetCallbackFn = (item: ExportTypeDefinition) => boolean;

export class ExportTypesRegistry {
  private _map: Map<string, ExportTypeDefinition> = new Map();

  constructor() {}

  register(item: ExportTypeDefinition): void {
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

  getById(id: string): ExportTypeDefinition {
    if (!this._map.has(id)) {
      throw new Error(`Unknown id ${id}`);
    }

    return this._map.get(id) as ExportTypeDefinition;
  }

  get(findType: GetCallbackFn): ExportTypeDefinition {
    let result;
    for (const value of this._map.values()) {
      if (!findType(value)) {
        continue; // try next value
      }
      const foundResult: ExportTypeDefinition = value;

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

// TODO: Define a 2nd ExportTypeRegistry instance for "immediate execute" report job types only.
// It should not require a `CreateJobFn` for its ExportTypeDefinitions, which only makes sense for async.
// Once that is done, the `any` types below can be removed.

/*
 * @return ExportTypeRegistry: the ExportTypeRegistry instance that should be
 * used to register async export type definitions
 */
export function getExportTypesRegistry(): ExportTypesRegistry {
  const registry = new ExportTypesRegistry();
  type CreateFnType = CreateJobFn<any, any>; // can not specify params types because different type of params are not assignable to each other
  type RunFnType = any; // can not specify because ImmediateExecuteFn is not assignable to RunTaskFn
  const getTypeFns: Array<() => ExportTypeDefinition<CreateFnType | null, RunFnType>> = [
    getTypeCsv,
    getTypeCsvFromSavedObject,
    getTypePng,
    getTypePngV2,
    getTypePrintablePdf,
    getTypePrintablePdfV2,
  ];
  getTypeFns.forEach((getType) => {
    registry.register(getType());
  });
  return registry;
}
