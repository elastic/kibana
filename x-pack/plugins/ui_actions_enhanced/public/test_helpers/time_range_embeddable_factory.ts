/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EmbeddableInput,
  IContainer,
  EmbeddableFactoryDefinition,
} from '../../../../../src/plugins/embeddable/public';
import { TimeRange } from '../../../../../src/plugins/data/public';
import { TIME_RANGE_EMBEDDABLE, TimeRangeEmbeddable } from './time_range_embeddable';

interface EmbeddableTimeRangeInput extends EmbeddableInput {
  timeRange: TimeRange;
}

export class TimeRangeEmbeddableFactory
  implements EmbeddableFactoryDefinition<EmbeddableTimeRangeInput> {
  public readonly type = TIME_RANGE_EMBEDDABLE;

  public async isEditable() {
    return true;
  }

  public async create(initialInput: EmbeddableTimeRangeInput, parent?: IContainer) {
    return new TimeRangeEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return 'time range';
  }
}
