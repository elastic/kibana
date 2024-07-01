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
import { COMMON_VISUALIZATION_GROUPING } from '@kbn/visualizations-plugin/public';
import type { LensPluginStartDependencies } from '../../plugin';

const ACTION_CREATE_ESQL_CHART = 'ACTION_CREATE_ESQL_CHART';

export const getAsyncHelpers = async () => await import('../../async_services');

export class CreateESQLPanelAction implements Action<EmbeddableApiContext> {
  public type = ACTION_CREATE_ESQL_CHART;
  public id = ACTION_CREATE_ESQL_CHART;
  public order = 50;

  public grouping = COMMON_VISUALIZATION_GROUPING;

  constructor(
    protected readonly startDependencies: LensPluginStartDependencies,
    protected readonly core: CoreStart
  ) {}

  public getDisplayName(): string {
    return i18n.translate('xpack.lens.app.createVisualizationLabel', {
      defaultMessage: 'ES|QL',
    });
  }

  public getIconType() {
    // need to create a new one
    return 'esqlVis';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!apiIsPresentationContainer(embeddable)) return false;
    // compatible only when ES|QL advanced setting is enabled
    const { isCreateActionCompatible } = await getAsyncHelpers();
    return isCreateActionCompatible(this.core);
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
    const { executeCreateAction } = await getAsyncHelpers();
    executeCreateAction({
      deps: this.startDependencies,
      core: this.core,
      api: embeddable,
    });
  }
}
