/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityIndexPrivilege } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

class DatasetQualityPrivileges {
  public async getHasIndexPrivileges(
    esClient: ElasticsearchClient,
    indexes: string[],
    privileges: SecurityIndexPrivilege[]
  ): Promise<Awaited<Record<string, boolean>>> {
    const indexPrivileges = await esClient.security.hasPrivileges({
      index: indexes.map((dataStream) => ({ names: dataStream, privileges })),
    });

    const indexesList = Object.keys(indexPrivileges.index);
    return indexesList.reduce((acc, index) => {
      const privilegesList = Object.values(indexPrivileges.index[index]);
      const hasAllPrivileges = privilegesList.every((hasPrivilege) => hasPrivilege);

      return Object.assign(acc, { [index]: hasAllPrivileges });
    }, {} as Record<string, boolean>);
  }

  public async getCanViewIntegrations(
    esClient: ElasticsearchClient,
    space = '*'
  ): Promise<boolean> {
    const applicationPrivileges = await esClient.security.hasPrivileges({
      application: [
        {
          application: 'kibana-.kibana',
          privileges: ['feature_fleet.read'],
          resources: [space],
        },
      ],
    });

    return (
      applicationPrivileges.application?.['kibana-.kibana']?.[space]?.['feature_fleet.read'] ??
      false
    );
  }
}

export const datasetQualityPrivileges = new DatasetQualityPrivileges();
