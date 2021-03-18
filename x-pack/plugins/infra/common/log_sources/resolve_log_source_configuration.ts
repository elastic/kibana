/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { SavedObjectsClientContract } from 'src/core/server';
// import { InfraSources } from '../../server/lib/sources';

// NOTE: This will handle real resolution for https://github.com/elastic/kibana/issues/92650 but for now just
// hands back properties from the saved object.
// export const resolveLogSourceConfiguration = (
//   sourceConfiguration:
// ) => {
//   const source = await sources.getSourceConfiguration(savedObjectsClient, sourceId);

//   return {
//     indexPattern: source.configuration.logAlias,
//     timestamp: source.configuration.fields.timestamp,
//   };
// }
