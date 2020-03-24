/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EmbeddableInput,
  IContainer,
  EmbeddableFactory,
  ErrorEmbeddable,
} from '../../../../../src/plugins/embeddable/public';
import { TimeRange } from '../../../../../src/plugins/data/public';
import { TIME_RANGE_EMBEDDABLE, TimeRangeEmbeddable } from './time_range_embeddable';

interface EmbeddableTimeRangeInput extends EmbeddableInput {
  timeRange: TimeRange;
}

export class TimeRangeEmbeddableFactory implements EmbeddableFactory<EmbeddableTimeRangeInput> {
  public readonly type = TIME_RANGE_EMBEDDABLE;
  public readonly isContainerType = false;

  public async isEditable() {
    return true;
  }

  public getDefaultInput() {
    return {};
  }

  public getExplicitInput() {
    return Promise.resolve({});
  }

  public canCreateNew() {
    return true;
  }

  public createFromSavedObject(
    savedObjectId: string,
    input: Partial<EmbeddableTimeRangeInput>,
    parent?: IContainer
  ) {
    return Promise.resolve(
      new ErrorEmbeddable(`Creation from saved object not supported by type ${this.type}`, {
        id: '',
      })
    );
  }

  public async create(initialInput: EmbeddableTimeRangeInput, parent?: IContainer) {
    return new TimeRangeEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return 'time range';
  }
}
