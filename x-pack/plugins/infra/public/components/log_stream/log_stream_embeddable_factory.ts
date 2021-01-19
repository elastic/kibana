/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import {
  EmbeddableFactoryDefinition,
  IContainer,
} from '../../../../../../src/plugins/embeddable/public';
import {
  LogStreamEmbeddable,
  LOG_STREAM_EMBEDDABLE,
  LogStreamEmbeddableInput,
} from './log_stream_embeddable';

export class LogStreamEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<LogStreamEmbeddableInput> {
  public readonly type = LOG_STREAM_EMBEDDABLE;

  constructor(private getCoreServices: () => Promise<CoreStart>) {}

  public async isEditable() {
    const { application } = await this.getCoreServices();
    return application.capabilities.logs.save as boolean;
  }

  public async create(initialInput: LogStreamEmbeddableInput, parent?: IContainer) {
    const services = await this.getCoreServices();
    return new LogStreamEmbeddable(services, initialInput, parent);
  }

  public getDisplayName() {
    return 'Log stream';
  }
}
