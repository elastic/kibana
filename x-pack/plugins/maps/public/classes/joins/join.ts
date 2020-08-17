/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IESTermSource } from '../sources/es_term_source';
import { JoinDescriptor } from '../../../common/descriptor_types';

export interface IJoin {
  getRightJoinSource(): IESTermSource;

  toDescriptor(): JoinDescriptor;

  getSourceMetaDataRequestId(): string;
}
