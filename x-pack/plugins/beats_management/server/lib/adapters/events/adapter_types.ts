/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BeatEvent } from '../../../../common/domain_types';
import { FrameworkUser } from '../../../../public/lib/adapters/framework/adapter_types';

export interface BeatEventsAdapter {
  bulkInsert(user: FrameworkUser, beatId: string, events: BeatEvent[]): Promise<void>;
}
