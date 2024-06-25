/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import type { LensPluginStartDependencies } from '../../plugin';

const ACTION_CREATE_DSL_LENS_CHART = 'ACTION_CREATE_DSL_LENS_CHART';

export const getAsyncHelpers = async () => await import('../../async_services');

export class CreateDSLPanelAction implements Action<EmbeddableApiContext> {
  public type = ACTION_CREATE_DSL_LENS_CHART;
  public id = ACTION_CREATE_DSL_LENS_CHART;
  public order = 30;

  constructor(
    protected readonly startDependencies: LensPluginStartDependencies,
    protected readonly core: CoreStart
  ) {}

  public getDisplayName(): string {
    return i18n.translate('xpack.lens.app.createDSLVisualizationLabel', {
      defaultMessage: 'Lens',
    });
  }

  public getIconType() {
    // need to create a new one
    return 'lensApp';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return apiIsPresentationContainer(embeddable);
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
    const { executeCreateDSLAction } = await getAsyncHelpers();
    executeCreateDSLAction({
      deps: this.startDependencies,
      core: this.core,
      api: embeddable,
    });
  }
}
