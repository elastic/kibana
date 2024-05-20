/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldsMetadataClient } from './fields_metadata_client';
import {
  FieldsMetadataServiceStartDeps,
  FieldsMetadataServiceSetup,
  FieldsMetadataServiceStart,
} from './types';

export class FieldsMetadataService {
  public setup(): FieldsMetadataServiceSetup {
    return {};
  }

  public start({ http }: FieldsMetadataServiceStartDeps): FieldsMetadataServiceStart {
    const client = new FieldsMetadataClient(http);

    return {
      client,
    };
  }
}
