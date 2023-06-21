/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  IContainer,
  EmbeddableInput,
  EmbeddableFactoryDefinition,
} from '@kbn/embeddable-plugin/public';
import { PLUGIN } from '../../../../../../../../common/constants/plugin';
import { STATUS_OVERVIEW_EMBEDDABLE, StatusOverviewEmbeddable } from './status_overview_embeddable';

export class StatusOverviewEmbeddableFactoryDefinition implements EmbeddableFactoryDefinition {
  public readonly type = STATUS_OVERVIEW_EMBEDDABLE;

  public readonly grouping = [
    {
      id: PLUGIN.SYNTHETICS_PLUGIN_ID,
      getDisplayName: () => PLUGIN.SYNTHETICS,
      getIconType: () => 'uptimeApp',
    },
  ];

  constructor() {}
  public async isEditable() {
    return true;
  }

  public async create(initialInput: EmbeddableInput, parent?: IContainer) {
    return new StatusOverviewEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return i18n.translate('xpack.synthetics.statusOverview.displayName', {
      defaultMessage: 'Status Overview',
    });
  }
}
