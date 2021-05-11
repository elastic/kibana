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
  ServicesErrorRateEmbeddable,
  ServicesErrorRateInput,
  SERVICES_ERROR_RATE_EMBEDDABLE,
} from './services_error_rate_embeddable';
import { APP_ID, APP_NAME, APP_ICON } from '../constants';

export type ServicesErrorRateEmbeddableFactory = EmbeddableFactory;
export class ServicesErrorRateEmbeddableFactoryDefinition
  implements
    EmbeddableFactoryDefinition<
      ServicesErrorRateInput,
      {},
      ServicesErrorRateEmbeddable
    > {
  public readonly type = SERVICES_ERROR_RATE_EMBEDDABLE;

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

  public async create(
    initialInput: ServicesErrorRateInput,
    parent?: IContainer
  ) {
    return new ServicesErrorRateEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return 'Services Error rate chart';
  }
}
