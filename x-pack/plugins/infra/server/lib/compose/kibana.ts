/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchFieldsAdapter } from '../adapters/fields/elasticsearch_fields_adapter';
import { InfraKibanaBackendFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { InfraBackendLibs, InfraDomainLibs } from '../infra_types';
import { ElasticsearchNodesAdapter } from './../adapters/nodes/elasticsearch_nodes_adapter';

import { Server } from 'hapi';
import { InfraFieldsDomain } from '../domains/fields_domain';
import { InfraNodesDomain } from '../domains/nodes_domain';

export function compose(server: Server): InfraBackendLibs {
  const framework = new InfraKibanaBackendFrameworkAdapter(server);

  const domainLibs: InfraDomainLibs = {
    fields: new InfraFieldsDomain(new ElasticsearchFieldsAdapter(framework)),
    nodes: new InfraNodesDomain(new ElasticsearchNodesAdapter(framework)),
  };

  const libs: InfraBackendLibs = {
    framework,
    ...domainLibs,
  };

  return libs;
}
