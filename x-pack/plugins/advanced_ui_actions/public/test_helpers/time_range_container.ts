/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ContainerInput,
  Container,
  ContainerOutput,
  GetEmbeddableFactory,
} from '../../../../../src/plugins/embeddable/public';
import { TimeRange } from '../../../../../src/plugins/data/public';

/**
 * interfaces are not allowed to specify a sub-set of the required types until
 * https://github.com/microsoft/TypeScript/issues/15300 is fixed so we use a type
 * here instead
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type InheritedChildrenInput = {
  timeRange: TimeRange;
  id?: string;
};

interface ContainerTimeRangeInput extends ContainerInput<InheritedChildrenInput> {
  timeRange: TimeRange;
}

const TIME_RANGE_CONTAINER = 'TIME_RANGE_CONTAINER';

export class TimeRangeContainer extends Container<
  InheritedChildrenInput,
  ContainerTimeRangeInput,
  ContainerOutput
> {
  public readonly type = TIME_RANGE_CONTAINER;
  constructor(
    initialInput: ContainerTimeRangeInput,
    getFactory: GetEmbeddableFactory,
    parent?: Container
  ) {
    super(initialInput, { embeddableLoaded: {} }, getFactory, parent);
  }

  public getInheritedInput() {
    return { timeRange: this.input.timeRange };
  }

  public render() {}

  public reload() {}
}
