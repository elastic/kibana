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
import { STATUS_GRID_EMBEDDABLE, StatusGridEmbeddable } from './status_grid_embeddable';

export class StatusGridEmbeddableFactoryDefinition implements EmbeddableFactoryDefinition {
  public readonly type = STATUS_GRID_EMBEDDABLE;

  public readonly grouping = [
    {
      id: PLUGIN.SYNTHETICS_PLUGIN_ID,
      getDisplayName: () => PLUGIN.SYNTHETICS,
      getIconType: () => 'uptimeApp',
    },
  ];

  constructor() {}

  /**
   * In our simple example, we let everyone have permissions to edit this. Most
   * embeddables should check the UI Capabilities service to be sure of
   * the right permissions.
   */
  public async isEditable() {
    return true;
  }

  public async create(initialInput: EmbeddableInput, parent?: IContainer) {
    return new StatusGridEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return i18n.translate('xpack.synthetics.statusGrid.displayName', {
      defaultMessage: 'Status Grid',
    });
  }
}
