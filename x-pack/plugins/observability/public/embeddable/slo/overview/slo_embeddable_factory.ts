/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreSetup } from '@kbn/core/public';
import {
  IContainer,
  EmbeddableFactoryDefinition,
  EmbeddableFactory,
  ErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { IProvidesPanelPlacementSettings } from '@kbn/dashboard-plugin/public/dashboard_container/component/panel_placement/types';
import { SLOEmbeddable, SLO_EMBEDDABLE } from './slo_embeddable';
import { ObservabilityPublicPluginsStart, ObservabilityPublicStart } from '../../..';
import type { SloEmbeddableInput } from './types';

export type SloOverviewEmbeddableFactory = EmbeddableFactory;
export class SloOverviewEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition, IProvidesPanelPlacementSettings<SloEmbeddableInput>
{
  public readonly type = SLO_EMBEDDABLE;

  constructor(
    private getStartServices: CoreSetup<
      ObservabilityPublicPluginsStart,
      ObservabilityPublicStart
    >['getStartServices']
  ) {}

  public async isEditable() {
    return true;
  }

  public async getExplicitInput(): Promise<Partial<SloEmbeddableInput>> {
    const [coreStart, pluginStart] = await this.getStartServices();
    try {
      const { resolveEmbeddableSloUserInput } = await import('./handle_explicit_input');
      return await resolveEmbeddableSloUserInput(coreStart, pluginStart);
    } catch (e) {
      return Promise.reject();
    }
  }

  public getPanelPlacementSettings: IProvidesPanelPlacementSettings<
    SloEmbeddableInput,
    unknown
  >['getPanelPlacementSettings'] = () => {
    const width = 8;
    const height = 7;
    return { width, height, strategy: 'placeAtTop' };
  };

  public async create(initialInput: SloEmbeddableInput, parent?: IContainer) {
    try {
      const [{ uiSettings, application, http, i18n: i18nService }] = await this.getStartServices();
      return new SLOEmbeddable(
        { uiSettings, application, http, i18n: i18nService },
        initialInput,
        parent
      );
    } catch (e) {
      return new ErrorEmbeddable(e, initialInput, parent);
    }
  }

  public getDescription() {
    return i18n.translate('xpack.observability.sloEmbeddable.description', {
      defaultMessage: 'Get an overview of your SLO health',
    });
  }

  public getDisplayName() {
    return i18n.translate('xpack.observability.sloEmbeddable.displayName', {
      defaultMessage: 'SLO Overview',
    });
  }

  public getIconType() {
    return 'visGauge';
  }
}
