/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IContainer, EmbeddableFactoryDefinition } from '@kbn/embeddable-plugin/public';
import { PLUGIN } from '../../../../../../../common/constants/plugin';
import {
  MonitorListEmbeddable,
  MONITOR_LIST_EMBEDDABLE,
  MonitorListInput,
} from './monitor_list_embeddable';

export class MonitorListEmbeddableFactoryDefinition implements EmbeddableFactoryDefinition {
  public readonly type = MONITOR_LIST_EMBEDDABLE;

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

  public async create(initialInput: MonitorListInput, parent?: IContainer) {
    return new MonitorListEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return i18n.translate('xpack.synthetics.monitorList.displayName', {
      defaultMessage: 'Monitor List',
    });
  }
}
