/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IESTermSource } from '../sources/es_term_source';
import { IJoin } from './join';
import { JoinDescriptor } from '../../../common/descriptor_types';
import { ISource } from '../sources/source';

export class InnerJoin implements IJoin {
  constructor(joinDescriptor: JoinDescriptor, leftSource: ISource);

  getRightJoinSource(): IESTermSource;

  toDescriptor(): JoinDescriptor;

  getSourceMetaDataRequestId(): string;

  getSourceFormattersDataRequestId(): string;
}
