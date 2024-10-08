/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EntityType } from '../../common/entities';

export function getEntityTypeLabel(entityType: EntityType) {
  switch (entityType) {
    case 'service':
      return i18n.translate('xpack.inventory.entityType.serviceLabel', {
        defaultMessage: 'Service',
      });
    case 'container':
      return i18n.translate('xpack.inventory.entityType.containerLabel', {
        defaultMessage: 'Container',
      });
    case 'host':
      return i18n.translate('xpack.inventory.entityType.hostLabel', {
        defaultMessage: 'Host',
      });
    default:
      return i18n.translate('xpack.inventory.entityType.naLabel', {
        defaultMessage: 'N/A',
      });
  }
}
