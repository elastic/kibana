/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { ChartsPluginStart } from 'src/plugins/charts/public';
import { ExpressionsSetup } from 'src/plugins/expressions/public';

import { CanvasSetup } from '../public';
import { EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import { UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { Start as InspectorStart } from '../../../../src/plugins/inspector/public';
import { AnyExpressionRenderDefinition } from '../types';

import { functions } from './functions/browser';
import { typeFunctions } from './expression_types';
import { renderFunctions, renderFunctionFactories } from './renderers';
interface SetupDeps {
  canvas: CanvasSetup;
  expressions: ExpressionsSetup;
}

export interface StartDeps {
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  inspector: InspectorStart;
  charts: ChartsPluginStart;
}

export type SetupInitializer<T> = (core: CoreSetup<StartDeps>, plugins: SetupDeps) => T;
export type StartInitializer<T> = (core: CoreStart, plugins: StartDeps) => T;

/** @internal */
export class CanvasSrcPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, plugins: SetupDeps) {
    const { expressions } = plugins;
    const releaseFunctions = expressions.leaseFunctions(functions);
    const releaseTypes = expressions.leaseTypes(typeFunctions);

    // There is an issue of the canvas render definition not matching the expression render definition
    // due to our handlers needing additional methods.  For now, we are going to cast to get to the proper
    // type, but we should work with AppArch to figure out how the Handlers can be genericized
    const releaseRenderers = expressions.leaseRenderers(
      (renderFunctions as unknown) as AnyExpressionRenderDefinition[]
    );

    let releaseFactories = () => {};

    core.getStartServices().then(([coreStart, depsStart]) => {
      const renderers = renderFunctionFactories.map((factory: any) =>
        factory(coreStart, depsStart)
      );
      releaseFactories = expressions.leaseRenderers(renderers);
    });

    plugins.canvas.addDatasourceUIs(async () => {
      // @ts-expect-error
      const { datasourceSpecs } = await import('./canvas_addons');
      return datasourceSpecs;
    });

    plugins.canvas.addElements(async () => {
      const { initializeElements } = await import('./canvas_addons');
      return initializeElements(core, plugins);
    });

    plugins.canvas.addModelUIs(async () => {
      // @ts-expect-error Untyped local
      const { modelSpecs } = await import('./canvas_addons');
      return modelSpecs;
    });

    plugins.canvas.addViewUIs(async () => {
      const { initializeViews } = await import('./canvas_addons');

      return initializeViews(core, plugins);
    });

    plugins.canvas.addArgumentUIs(async () => {
      const { initializeArgs } = await import('./canvas_addons');
      return initializeArgs(core, plugins);
    });

    plugins.canvas.addTagUIs(async () => {
      const { tagSpecs } = await import('./canvas_addons');
      return tagSpecs;
    });

    plugins.canvas.addTransformUIs(async () => {
      // @ts-expect-error Untyped local
      const { transformSpecs } = await import('./canvas_addons');
      return transformSpecs;
    });

    return () => {
      releaseFunctions();
      releaseTypes();
      releaseRenderers();
      releaseFactories();
    };
  }

  public start(core: CoreStart, plugins: StartDeps) {}
}
