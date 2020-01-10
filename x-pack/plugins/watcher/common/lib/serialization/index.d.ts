/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SerializeThresholdWatchConfig } from './serialization_types';

export declare function serializeJsonWatch(name: string, json: any): any;
export declare function serializeThresholdWatch(config: SerializeThresholdWatchConfig): any;
export declare function buildInput(config: any): any;
