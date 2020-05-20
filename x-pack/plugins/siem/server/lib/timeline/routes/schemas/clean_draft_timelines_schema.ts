/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as rt from 'io-ts';

import { TimelineTypeLiteralRt } from '../../../../../common/types/timeline';

export const cleanDraftTimelineSchema = rt.type({
  timelineType: TimelineTypeLiteralRt,
});
