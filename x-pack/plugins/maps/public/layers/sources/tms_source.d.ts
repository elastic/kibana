/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractSource, ISource } from './source';
import { XYZTMSSourceDescriptor } from '../../../common/descriptor_types';

export interface ITMSSource extends ISource {
  getUrlTemplate(): Promise<string>;
}

export class AbstractTMSSource extends AbstractSource implements ITMSSource {
  readonly _descriptor: XYZTMSSourceDescriptor;
  getUrlTemplate(): Promise<string>;
}
