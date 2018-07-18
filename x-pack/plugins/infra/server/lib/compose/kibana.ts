/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

import { InfraKibanaConfigurationAdapter } from '../adapters/configuration/kibana_configuration_adapter';
import { ElasticsearchFieldsAdapter } from '../adapters/fields/elasticsearch_fields_adapter';
import { InfraKibanaBackendFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { InfraConfigurationSourcesAdapter } from '../adapters/sources/configuration_sources_adapter';
import { InfraFieldsDomain } from '../domains/fields_domain';
import { InfraNodesDomain } from '../domains/nodes_domain';
import { InfraBackendLibs, InfraConfiguration, InfraDomainLibs } from '../infra_types';
import { ElasticsearchNodesAdapter } from './../adapters/nodes/elasticsearch_nodes_adapter';

export function compose(server: Server): InfraBackendLibs {
  const configuration = new InfraKibanaConfigurationAdapter<InfraConfiguration>(server);
  const framework = new InfraKibanaBackendFrameworkAdapter(server);
  const sources = new InfraConfigurationSourcesAdapter(configuration);

  const domainLibs: InfraDomainLibs = {
    fields: new InfraFieldsDomain(new ElasticsearchFieldsAdapter(framework)),
    nodes: new InfraNodesDomain(new ElasticsearchNodesAdapter(framework)),
  };

  const libs: InfraBackendLibs = {
    configuration,
    framework,
    sources,
    ...domainLibs,
  };

  return libs;
}
