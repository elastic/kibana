/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, CoreSetup, Plugin } from 'src/core/public';
import { UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { EmbeddableSetup } from '../../../../src/plugins/embeddable/public';
import { getCreateEmbeddableFactory } from './create_embeddable_factory';

export interface SetupDependencies {
  embeddable: EmbeddableSetup;
}

export interface StartDependencies {
  uiActions: UiActionsStart;
}

// eslint-disable-next-line
export interface SetupContract {}

// eslint-disable-next-line
export interface StartContract {}

export class EmbeddableEnhancedPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies> {
  public setup(
    core: CoreSetup<StartDependencies>,
    { embeddable }: SetupDependencies
  ): SetupContract {
    embeddable.setCreateEmbeddableFactory(getCreateEmbeddableFactory());
    return {};
  }

  public start(core: CoreStart, plugins: StartDependencies) {
    return {};
  }

  public stop() {}
}
