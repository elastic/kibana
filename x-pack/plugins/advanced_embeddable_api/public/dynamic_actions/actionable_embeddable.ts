/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EmbeddableOutput,
  Embeddable,
  EmbeddableInput,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { SerializedDynamicAction } from './action_saved_object';

export function hasDynamicActions(
  embeddable: Embeddable | ActionableEmbeddable
): embeddable is ActionableEmbeddable {
  return (embeddable as ActionableEmbeddable).getInput().dynamicActions !== undefined;
}

interface ActionableEmbeddableInput extends EmbeddableInput {
  dynamicActions: SerializedDynamicAction[];
}

export class ActionableEmbeddable<
  EI extends ActionableEmbeddableInput = ActionableEmbeddableInput,
  O extends EmbeddableOutput = EmbeddableOutput
> extends Embeddable<EI, O> {}
