/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { Action } from '@kbn/ui-actions-plugin/public';
import type { LensPluginStartDependencies } from '../../plugin';

// import { isLensEmbeddable } from '../utils';

const ACTION_CREATE_ESQL_CHART = 'ACTION_CREATE_ESQL_CHART';

export const getAsyncHelpers = async () => await import('../../async_services');

export class CreateESQLPanelAction implements Action<{}> {
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
    return 'tableDensityExpanded';
  }

  public async isCompatible() {
    // check the UI setting value here
    return true;
  }

  public async execute() {
    const { executeCreateAction } = await getAsyncHelpers();
    executeCreateAction({ deps: this.startDependencies });
  }
}
