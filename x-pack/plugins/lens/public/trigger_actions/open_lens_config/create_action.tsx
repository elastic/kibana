/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { Action } from '@kbn/ui-actions-plugin/public';
import type { LensPluginStartDependencies } from '../../plugin';
// import { isLensEmbeddable } from '../utils';

const ACTION_CREATE_ESQL_CHART = 'ACTION_CREATE_ESQL_CHART';

interface Context {
  factories: EmbeddableFactory[];
}

export const getConfigureLensHelpersAsync = async () => await import('../../async_services');

export class CreateESQLPanelAction implements Action<Context> {
  public type = ACTION_CREATE_ESQL_CHART;
  public id = ACTION_CREATE_ESQL_CHART;
  public order = 50;

  constructor(
    protected readonly startDependencies: LensPluginStartDependencies,
    protected readonly overlays: OverlayStart,
    protected readonly theme: ThemeServiceStart
  ) {}

  public getDisplayName(context: Context): string {
    return i18n.translate('xpack.lens.app.createVisualizationLabel', {
      defaultMessage: 'ESQL',
    });
  }

  public getIconType() {
    // need to create a new one
    return 'tableDensityExpanded';
  }

  public async isCompatible({ factories }: Context) {
    const factory = factories.find(({ type }) => type === 'lens');
    return Boolean(factory);
  }

  public async execute({ factories }: Context) {
    // const factory = factories.find(({ type }) => type === 'lens');
    // create a new embeddable with factory.create
  }
}
