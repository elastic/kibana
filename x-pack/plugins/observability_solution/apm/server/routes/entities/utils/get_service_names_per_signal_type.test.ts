// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License
//  * 2.0; you may not use this file except in compliance with the Elastic License
//  * 2.0.
//  */

// import { EntityServiceListItem, SignalTypes } from '../../../../common/assets/types';
// import { getServiceNamesPerSignalType } from './get_service_names_per_signal_type';

// describe('getServiceNamesPerSignalType', () => {
//   it('returns empty arrays when serviceAssets is empty', () => {
//     const serviceAssets: EntityServiceListItem[] = [];
//     const result = getServiceNamesPerSignalType(serviceAssets);
//     expect(result).toEqual({ tracesServiceNames: [], logsServiceNames: [] });
//   });

//   it('returns service names for assets with traces signal types', () => {
//     const serviceAssets = [
//       {
//         signalTypes: [SignalTypes.METRICS],
//         serviceName: 'Service1',
//       },
//       {
//         signalTypes: [SignalTypes.LOGS],
//         serviceName: 'Service2',
//       },
//     ];
//     const result = getServiceNamesPerSignalType(serviceAssets);
//     expect(result).toEqual({ tracesServiceNames: ['Service1'], logsServiceNames: [] });
//   });

//   // it('returns service names for assets with logs signal types', () => {
//   //   const serviceAssets: EntityServiceListItem[] = [
//   //     {
//   //       asset: {
//   //         signalTypes: { 'asset.logs': true, 'asset.traces': false },
//   //         identifyingMetadata: [],
//   //       },
//   //       service: { name: 'Service1' },
//   //     },
//   //     {
//   //       asset: {
//   //         signalTypes: { 'asset.logs': false, 'asset.traces': false },
//   //         identifyingMetadata: [],
//   //       },
//   //       service: { name: 'Service2' },
//   //     },
//   //   ];
//   //   const result = getServiceNamesPerSignalType(serviceAssets);
//   //   expect(result).toEqual({ tracesServiceNames: [], logsServiceNames: ['Service1'] });
//   // });

//   // it('returns empty arrays when there are no assets with signal types', () => {
//   //   const serviceAssets: EntityServiceListItem[] = [
//   //     {
//   //       asset: {
//   //         signalTypes: { 'asset.logs': false, 'asset.traces': false },
//   //         identifyingMetadata: [],
//   //       },
//   //       service: { name: 'Service1' },
//   //     },
//   //     {
//   //       asset: {
//   //         signalTypes: { 'asset.logs': false, 'asset.traces': false },
//   //         identifyingMetadata: [],
//   //       },
//   //       service: { name: 'Service2' },
//   //     },
//   //   ];
//   //   const result = getServiceNamesPerSignalType(serviceAssets);
//   //   expect(result).toEqual({ tracesServiceNames: [], logsServiceNames: [] });
//   // });

//   // it('returns service names for assets with logs and traces signal types', () => {
//   //   const serviceAssets: EntityServiceListItem[] = [
//   //     {
//   //       asset: {
//   //         signalTypes: { 'asset.logs': true, 'asset.traces': true },
//   //         identifyingMetadata: [],
//   //       },
//   //       service: { name: 'Service1' },
//   //     },
//   //     {
//   //       asset: {
//   //         signalTypes: { 'asset.logs': true, 'asset.traces': true },
//   //         identifyingMetadata: [],
//   //       },
//   //       service: { name: 'Service2' },
//   //     },
//   //   ];
//   //   const result = getServiceNamesPerSignalType(serviceAssets);
//   //   expect(result).toEqual({
//   //     tracesServiceNames: ['Service1', 'Service2'],
//   //     logsServiceNames: ['Service1', 'Service2'],
//   //   });
//   // });
// });
