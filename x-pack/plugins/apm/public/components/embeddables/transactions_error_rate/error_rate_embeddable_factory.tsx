/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  IContainer,
} from '../../../../../../../src/plugins/embeddable/public';
import {
  ErrorRateEmbeddable,
  ErrorRateInput,
  ERROR_RATE_EMBEDDABLE,
} from './error_rate_embeddable';
import { APP_ID, APP_NAME, APP_ICON } from '../constants';

export type ErrorRateEmbeddableFactory = EmbeddableFactory;
export class ErrorRateEmbeddableFactoryDefinition
  implements
    EmbeddableFactoryDefinition<ErrorRateInput, {}, ErrorRateEmbeddable> {
  public readonly type = ERROR_RATE_EMBEDDABLE;

  public readonly grouping = [
    {
      id: APP_ID,
      getDisplayName: () => APP_NAME,
      getIconType: () => APP_ICON,
    },
  ];

  public async isEditable() {
    return true;
  }

  public async create(initialInput: ErrorRateInput, parent?: IContainer) {
    return new ErrorRateEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return 'Error rate chart';
  }
}
