/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { Action } from '@kbn/ui-actions-plugin/public';
import type { LensPluginStartDependencies } from '../../plugin';
import { isLensEmbeddable } from '../utils';

const ACTION_CONFIGURE_IN_LENS = 'ACTION_CONFIGURE_IN_LENS';

interface Context {
  embeddable: IEmbeddable;
}

export const getConfigureLensHelpersAsync = async () => await import('../../async_services');

export class ConfigureInLensPanelAction implements Action<Context> {
  public type = ACTION_CONFIGURE_IN_LENS;
  public id = ACTION_CONFIGURE_IN_LENS;
  public order = 50;

  constructor(
    protected readonly startDependencies: LensPluginStartDependencies,
    protected readonly overlays: OverlayStart,
    protected readonly theme: ThemeServiceStart
  ) {}

  public getDisplayName({ embeddable }: Context): string {
    const language = isLensEmbeddable(embeddable) ? embeddable.getTextBasedLanguage() : undefined;
    return i18n.translate('xpack.lens.app.editVisualizationLabel', {
      defaultMessage: 'Edit {lang} visualization',
      values: { lang: language },
    });
  }

  public getIconType() {
    return 'pencil';
  }

  public async isCompatible({ embeddable }: Context) {
    const { isActionCompatible } = await getConfigureLensHelpersAsync();
    return isActionCompatible(embeddable);
  }

  public async execute({ embeddable }: Context) {
    const { executeAction } = await getConfigureLensHelpersAsync();
    return executeAction({
      embeddable,
      startDependencies: this.startDependencies,
      overlays: this.overlays,
      theme: this.theme,
    });
  }
}
