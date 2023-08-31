/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  IContainer,
  EmbeddableInput,
  EmbeddableFactoryDefinition,
} from '@kbn/embeddable-plugin/public';
import { ElasticFlameGraph } from '@kbn/profiling-data-access-plugin/common/flamegraph';
import { HelloWorld, HELLO_WORLD } from './hello_world';

interface HelloWorldInput {
  data?: ElasticFlameGraph;
}

export type HelloWorldEmbeddableInput = HelloWorldInput & EmbeddableInput;

export class HelloWorldFactory implements EmbeddableFactoryDefinition<HelloWorldEmbeddableInput> {
  readonly type = HELLO_WORLD;

  async isEditable() {
    return false;
  }

  async create(input: HelloWorldEmbeddableInput, parent?: IContainer) {
    return new HelloWorld(input, {}, parent);
  }

  getDisplayName() {
    return 'Hello World';
  }
}
