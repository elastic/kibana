/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { ProducDocInstallDTO } from '../../../common/saved_objects';
import type { KnowledgeBaseProductDocInstallAttributes } from '../../saved_objects';

export const soToDto = (
  so: SavedObject<KnowledgeBaseProductDocInstallAttributes>
): ProducDocInstallDTO => {
  return {
    id: so.id,
    packageName: so.attributes.package_name,
    packageVersion: so.attributes.package_version,
    productName: so.attributes.product_name,
    installationStatus: so.attributes.installation_status,
    indexName: so.attributes.index_name,
    lastInstallationDate: so.attributes.last_installation_date
      ? new Date(so.attributes.last_installation_date)
      : undefined,
  };
};
