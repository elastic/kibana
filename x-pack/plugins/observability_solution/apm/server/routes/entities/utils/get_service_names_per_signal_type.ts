// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License
//  * 2.0; you may not use this file except in compliance with the Elastic License
//  * 2.0.
//  */

// import { EntityServiceListItem, SignalTypes } from '../../../../common/assets/types';

// export function getServiceNamesPerSignalType(serviceEntities: EntityServiceListItem[]) {
//   const tracesServiceNames = serviceEntities
//     .filter(({ signalTypes }) => signalTypes.includes(SignalTypes.METRICS))
//     .map(({ serviceName }) => serviceName);

//   const logsServiceNames = serviceEntities
//     .filter(({ signalTypes }) => signalTypes.includes(SignalTypes.LOGS))
//     .map(({ serviceName }) => serviceName);

//   return { tracesServiceNames, logsServiceNames };
// }
