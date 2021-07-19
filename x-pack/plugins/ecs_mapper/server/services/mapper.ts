/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldRenameAction } from '../types';
import { CoreStart } from 'kibana/public';

interface MapperConstructor {
  http: CoreStart['http'];
}

export class Mapper {
  private readonly http: CoreStart['http'];

  constructor({ http }: MapperConstructor) {
    this.http = http;
  }
  
  public mapToIngestPipeline = async (file: string, renanmeAction?: FieldRenameAction): Promise<boolean> => {
    console.log("Time to do some mapping!")
    return true;
  };
  
}