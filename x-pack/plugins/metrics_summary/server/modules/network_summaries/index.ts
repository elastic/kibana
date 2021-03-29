/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sourceIpEntities from './source_ip_entities.json';
import destinationIpEntities from './destination_ip_entities.json';
import sourceIpEntitiesMapping from './source_ip_entities_mapping.json';
import destinationIpEntitiesMapping from './destination_ip_entities_mapping.json';
import destinationCountryIsoCodeEntities from './destination_country_iso_code_entities.json';
import destinationCountryIsoCodeEntitiesMapping from './destination_country_iso_code_entities_mapping.json';
import sourceCountryIsoCodeEntities from './source_country_iso_code_entities.json';
import sourceCountryIsoCodeEntitiesMapping from './source_country_iso_code_entities_mapping.json';

export {
  sourceIpEntities,
  destinationIpEntities,
  sourceCountryIsoCodeEntities,
  sourceCountryIsoCodeEntitiesMapping,
  destinationCountryIsoCodeEntities,
  destinationCountryIsoCodeEntitiesMapping,
  sourceIpEntitiesMapping,
  destinationIpEntitiesMapping,
};
