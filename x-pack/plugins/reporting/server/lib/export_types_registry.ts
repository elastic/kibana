/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';
// import { getExportType as getTypeCsvFromSavedObject } from '../export_types/csv_v2';
// import { getExportType as getTypeCsvFromSavedObjectImmediate } from '../export_types/csv_searchsource_immediate';
// import { getExportType as getTypeCsv } from '../export_types/csv_searchsource';
// import { getExportType as getTypePng } from '../export_types/png';
// import { getExportType as getTypePngV2 } from '../export_types/png_v2';
// import { getExportType as getTypePrintablePdf } from '../export_types/printable_pdf';
// import { getExportType as getTypePrintablePdfV2 } from '../export_types/printable_pdf_v2';

import { ExportType } from '../export_types/common';

type GetCallbackFn = (item: ExportType) => boolean;

export class ExportTypesRegistry {
  private _map: Map<string, ExportType> = new Map();

  constructor() {}

  register(item: ExportType): void {
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

  getById(id: string): ExportType {
    if (!this._map.has(id)) {
      throw new Error(`Unknown id ${id}`);
    }

    return this._map.get(id) as ExportType;
  }

  get(findType: GetCallbackFn): ExportType {
    let result;
    for (const value of this._map.values()) {
      if (!findType(value)) {
        continue; // try next value
      }
      const foundResult: ExportType = value;

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

/*
 * @return ExportTypeRegistry: the ExportTypeRegistry instance that should be
 * used to register async export type definitions
 */
export function getExportTypesRegistry(): ExportTypesRegistry {
  const registry = new ExportTypesRegistry();
  registry.getAll().map((exportType) => registry.register(exportType));
  return registry;
}
