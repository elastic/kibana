/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PathReporter } from 'io-ts/lib/PathReporter';
import { BeatEvent, RuntimeBeatEvent } from '../../common/domain_types';
import { BeatEventsAdapter } from './adapters/events/adapter_types';
import { FrameworkUser } from './adapters/framework/adapter_types';
import { CMBeatsDomain } from './beats';

export class BeatEventsLib {
  // @ts-ignore
  constructor(private readonly adapter: BeatEventsAdapter, beats: CMBeatsDomain) {}

  public log = async (
    user: FrameworkUser,
    beatId: string,
    events: BeatEvent[]
  ): Promise<Array<{ success: boolean; reason?: string }>> => {
    return events.map(event => {
      const assertData = RuntimeBeatEvent.decode(event);
      if (assertData.isLeft()) {
        return {
          success: false,
          error: `Error parsing event, ${PathReporter.report(assertData)[0]}`,
        };
      }
      return { success: true };
    });
  };
}
