/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { Action } from '@kbn/ui-actions-plugin/public';
import type { LensPluginStartDependencies } from '../../plugin';
import type { StartServices } from '../../types';
import { isLensApi } from '../../react_embeddable/type_guards';

const ACTION_CONFIGURE_IN_LENS = 'ACTION_CONFIGURE_IN_LENS';

interface Context {
  api: unknown;
}

export const getConfigureLensHelpersAsync = async () => await import('../../async_services');

export class ConfigureInLensPanelAction implements Action<Context> {
  public type = ACTION_CONFIGURE_IN_LENS;
  public id = ACTION_CONFIGURE_IN_LENS;
  public order = 50;

  constructor(
    protected readonly startDependencies: LensPluginStartDependencies,
    protected readonly startServices: StartServices
  ) {}

  public getDisplayName({ api }: Context): string {
    const language = isLensApi(api) ? api.isTextBasedLanguage() : undefined;
    return i18n.translate('xpack.lens.app.editVisualizationLabel', {
      defaultMessage: 'Edit {lang} visualization',
      values: { lang: language },
    });
  }

  public getIconType() {
    return 'pencil';
  }

  public async isCompatible({ api }: Context) {
    const { isEditActionCompatible } = await getConfigureLensHelpersAsync();
    return isEditActionCompatible(api);
  }

  public async execute({ api }: Context) {
    const { executeEditAction } = await getConfigureLensHelpersAsync();
    return executeEditAction({
      api,
      startDependencies: this.startDependencies,
      ...this.startServices,
    });
  }
}
