/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// {
//   data: {
//     allSites: { activeLicenses: 815, totalLicenses: 25 },
//     sites: [
//       {
//         accountId: '1392053568574369781',
//         accountName: 'Elastic',
//         activeLicenses: 10,
//         createdAt: '2022-04-05T16:01:56.927213Z',
//         creator: 'Sandeep Minhas',
//         creatorId: '1336326529793417045',
//         description: null,
//         expiration: null,
//         externalId: '1b8a963e-0a0f-2861-09cb-42d27bd27d72',
//         healthStatus: true,
//         id: '1392053568582758390',
//         isDefault: true,
//         licenses: {
//           bundles: [ [Object] ],
//           modules: [ [Object] ],
//           settings: [ [Object], [Object], [Object], [Object] ]
//         },
//         name: 'Default site',
//         registrationToken: 'eyJ1cmwiOiAiaHR0cHM6Ly91c2VhMS1wYXJ0bmVycy5zZW50aW5lbG9uZS5uZXQiLCAic2l0ZV9rZXkiOiAiOTJlYzQyMGJjNDhjNjM1OCJ9',
//         siteType: 'Trial',
//         sku: 'Complete',
//         state: 'active',
//         suite: 'Complete',
//         totalLicenses: 25,
//         unlimitedExpiration: true,
//         unlimitedLicenses: false,
//         updatedAt: '2023-08-27T08:04:39.306240Z'
//       }
//     ]
//   },
//   pagination: { nextCursor: null, totalItems: 1 }
// }

export interface S1ListResponse<D = any> {
  data: D;
  pagination: {
    nextCursor: null | string;
    totalItems: number;
  };
}

export interface S1Site {
  accountId: string;
  accountName: string;
  activeLicenses: number;
  createdAt: string;
  creator: string;
  creatorId: string;
  description: null | string;
  expiration: null | string;
  externalId: string;
  healthStatus: boolean;
  id: string;
  isDefault: boolean;
  licenses: {
    bundles: Array<{
      displayName: string;
      majorVersion: number;
      minorVersion: number;
      name: string;
      surfaces: Array<{ count: number; name: string }>;
      totalSurfaces: number;
    }>;
    modules: Array<{
      displayName: string;
      majorVersion: number;
      name: string;
    }>;
    settings: Array<{
      displayName: string;
      groupName: string;
      setting: string;
      settingGroup: string;
      settingGroupDisplayName: string;
    }>;
  };
  name: string;
  registrationToken: string;
  siteType: string;
  sku: string;
  state: string;
  suite: string;
  totalLicenses: number;
  unlimitedExpiration: boolean;
  unlimitedLicenses: boolean;
  updatedAt: string;
}

export type S1SitesListApiResponse = S1ListResponse<{
  allSites: {
    activeLicenses: number;
    totalLicenses: number;
  };
  sites: S1Site[];
}>;

export interface S1AgentPackage {
  accounts: string[];
  createdAt: string;
  fileExtension: string;
  fileName: string;
  fileSize: number;
  id: string;
  link: string;
  majorVersion: string;
  minorVersion: string;
  osArch: string;
  osType: string;
  packageType: string;
  platformType: string;
  rangerVersion: null | string;
  sites: string[];
  scopeLevel: string;
  sha1: string;
  status: string;
  updatedAt: string;
  version: string;
}

export type S1AgentPackageListApiResponse = S1ListResponse<S1AgentPackage[]>;
