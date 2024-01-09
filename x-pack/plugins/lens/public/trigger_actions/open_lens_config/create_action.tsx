/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { Action } from '@kbn/ui-actions-plugin/public';
import type {
  EmbeddableFactory,
  EmbeddableInput,
  IEmbeddable,
} from '@kbn/embeddable-plugin/public';
import type { LensPluginStartDependencies } from '../../plugin';

const ACTION_CREATE_ESQL_CHART = 'ACTION_CREATE_ESQL_CHART';

interface Context {
  createNewEmbeddable: (
    embeddableFactory: EmbeddableFactory,
    initialInput?: Partial<EmbeddableInput>,
    dismissNotification?: boolean
  ) => Promise<undefined | IEmbeddable>;
  deleteEmbeddable: (embeddableId: string) => void;
  initialInput?: Partial<EmbeddableInput>;
}

export const getAsyncHelpers = async () => await import('../../async_services');

export class CreateESQLPanelAction implements Action<Context> {
  public type = ACTION_CREATE_ESQL_CHART;
  public id = ACTION_CREATE_ESQL_CHART;
  public order = 50;

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

  public async isCompatible() {
    // compatible only when ES|QL advanced setting is enabled
    const { isCreateActionCompatible } = await getAsyncHelpers();
    return isCreateActionCompatible(this.core);
  }

  public async execute({ createNewEmbeddable, deleteEmbeddable }: Context) {
    const { executeCreateAction } = await getAsyncHelpers();
    executeCreateAction({
      deps: this.startDependencies,
      core: this.core,
      createNewEmbeddable,
      deleteEmbeddable,
    });
  }
}
