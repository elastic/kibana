/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { CanvasSetup } from '../public';
import { EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import { UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { Start as InspectorStart } from '../../../../src/plugins/inspector/public';

import { functions } from './functions/browser';
import { typeFunctions } from './expression_types';
// @ts-expect-error: untyped local
import { renderFunctions, renderFunctionFactories } from './renderers';
import { initializeElements } from './elements';
// @ts-expect-error untyped local
import { transformSpecs } from './uis/transforms';
// @ts-expect-error untyped local
import { datasourceSpecs } from './uis/datasources';
// @ts-expect-error untyped local
import { modelSpecs } from './uis/models';
import { initializeViews } from './uis/views';
import { initializeArgs } from './uis/arguments';
import { tagSpecs } from './uis/tags';

interface SetupDeps {
  canvas: CanvasSetup;
}

export interface StartDeps {
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  inspector: InspectorStart;
}

export type SetupInitializer<T> = (core: CoreSetup<StartDeps>, plugins: SetupDeps) => T;
export type StartInitializer<T> = (core: CoreStart, plugins: StartDeps) => T;

/** @internal */
export class CanvasSrcPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, plugins: SetupDeps) {
    plugins.canvas.addFunctions(functions);
    plugins.canvas.addTypes(typeFunctions);

    plugins.canvas.addRenderers(renderFunctions);

    core.getStartServices().then(([coreStart, depsStart]) => {
      plugins.canvas.addRenderers(
        renderFunctionFactories.map((factory: any) => factory(coreStart, depsStart))
      );
    });

    plugins.canvas.addElements(initializeElements(core, plugins));
    plugins.canvas.addDatasourceUIs(datasourceSpecs);
    plugins.canvas.addModelUIs(modelSpecs);
    plugins.canvas.addViewUIs(initializeViews(core, plugins));
    plugins.canvas.addArgumentUIs(initializeArgs(core, plugins));
    plugins.canvas.addTagUIs(tagSpecs);
    plugins.canvas.addTransformUIs(transformSpecs);
  }

  public start(core: CoreStart, plugins: StartDeps) {}
}
