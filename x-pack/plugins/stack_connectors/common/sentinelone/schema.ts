/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { schema } from '@kbn/config-schema';
import { SUB_ACTION } from './constants';

// Connector schema
export const SentinelOneConfigSchema = schema.object({ url: schema.string() });
export const SentinelOneSecretsSchema = schema.object({
  token: schema.string(),
});

export const SentinelOneBaseApiResponseSchema = schema.object({}, { unknowns: 'allow' });

export const SentinelOneGetAgentsResponseSchema = schema.object({
  pagination: schema.object({
    totalItems: schema.number(),
    nextCursor: schema.nullable(schema.string()),
  }),
  errors: schema.nullable(schema.arrayOf(schema.string())),
  data: schema.arrayOf(
    schema.object({
      modelName: schema.string(),
      firewallEnabled: schema.boolean(),
      totalMemory: schema.number(),
      osName: schema.string(),
      cloudProviders: schema.recordOf(schema.string(), schema.any()),
      siteName: schema.string(),
      cpuId: schema.string(),
      isPendingUninstall: schema.boolean(),
      isUpToDate: schema.boolean(),
      osArch: schema.string(),
      accountId: schema.string(),
      locationEnabled: schema.boolean(),
      consoleMigrationStatus: schema.string(),
      scanFinishedAt: schema.nullable(schema.string()),
      operationalStateExpiration: schema.nullable(schema.string()),
      agentVersion: schema.string(),
      isActive: schema.boolean(),
      locationType: schema.string(),
      activeThreats: schema.number(),
      inRemoteShellSession: schema.boolean(),
      allowRemoteShell: schema.boolean(),
      serialNumber: schema.nullable(schema.string()),
      updatedAt: schema.string(),
      lastActiveDate: schema.string(),
      firstFullModeTime: schema.nullable(schema.string()),
      operationalState: schema.string(),
      externalId: schema.string(),
      mitigationModeSuspicious: schema.string(),
      licenseKey: schema.string(),
      cpuCount: schema.number(),
      mitigationMode: schema.string(),
      networkStatus: schema.string(),
      installerType: schema.string(),
      uuid: schema.string(),
      detectionState: schema.nullable(schema.string()),
      infected: schema.boolean(),
      registeredAt: schema.string(),
      lastIpToMgmt: schema.string(),
      storageName: schema.nullable(schema.string()),
      osUsername: schema.string(),
      groupIp: schema.string(),
      createdAt: schema.string(),
      remoteProfilingState: schema.string(),
      groupUpdatedAt: schema.nullable(schema.string()),
      scanAbortedAt: schema.nullable(schema.string()),
      isUninstalled: schema.boolean(),
      networkQuarantineEnabled: schema.boolean(),
      tags: schema.object({
        sentinelone: schema.arrayOf(
          schema.object({
            assignedBy: schema.string(),
            assignedAt: schema.string(),
            assignedById: schema.string(),
            key: schema.string(),
            value: schema.string(),
            id: schema.string(),
          })
        ),
      }),
      externalIp: schema.string(),
      siteId: schema.string(),
      machineType: schema.string(),
      domain: schema.string(),
      scanStatus: schema.string(),
      osStartTime: schema.string(),
      accountName: schema.string(),
      lastLoggedInUserName: schema.string(),
      showAlertIcon: schema.boolean(),
      rangerStatus: schema.string(),
      groupName: schema.string(),
      threatRebootRequired: schema.boolean(),
      remoteProfilingStateExpiration: schema.nullable(schema.string()),
      policyUpdatedAt: schema.nullable(schema.string()),
      activeDirectory: schema.object({
        userPrincipalName: schema.nullable(schema.string()),
        lastUserDistinguishedName: schema.nullable(schema.string()),
        computerMemberOf: schema.arrayOf(schema.object({ type: schema.string() })),
        lastUserMemberOf: schema.arrayOf(schema.object({ type: schema.string() })),
        mail: schema.nullable(schema.string()),
        computerDistinguishedName: schema.nullable(schema.string()),
      }),
      isDecommissioned: schema.boolean(),
      rangerVersion: schema.string(),
      userActionsNeeded: schema.arrayOf(
        schema.object({
          type: schema.string(),
          example: schema.string(),
          enum: schema.arrayOf(schema.string()),
        })
      ),
      locations: schema.nullable(
        schema.arrayOf(
          schema.object({ name: schema.string(), scope: schema.string(), id: schema.string() })
        )
      ),
      id: schema.string(),
      coreCount: schema.number(),
      osRevision: schema.string(),
      osType: schema.string(),
      groupId: schema.string(),
      computerName: schema.string(),
      scanStartedAt: schema.string(),
      encryptedApplications: schema.boolean(),
      storageType: schema.nullable(schema.string()),
      networkInterfaces: schema.arrayOf(
        schema.object({
          gatewayMacAddress: schema.nullable(schema.string()),
          inet6: schema.arrayOf(schema.string()),
          name: schema.string(),
          inet: schema.arrayOf(schema.string()),
          physical: schema.string(),
          gatewayIp: schema.nullable(schema.string()),
          id: schema.string(),
        })
      ),
      fullDiskScanLastUpdatedAt: schema.string(),
      appsVulnerabilityStatus: schema.string(),
    })
  ),
});

export const SentinelOneIsolateAgentResponseSchema = schema.object({
  errors: schema.nullable(schema.arrayOf(schema.string())),
  data: schema.object({
    affected: schema.number(),
  }),
});

export const SentinelOneGetRemoteScriptsParamsSchema = schema.object({
  query: schema.nullable(schema.string()),
  osTypes: schema.nullable(schema.arrayOf(schema.string())),
});

export const SentinelOneGetRemoteScriptsResponseSchema = schema.object({
  errors: schema.nullable(schema.arrayOf(schema.string())),
  pagination: schema.object({
    nextCursor: schema.nullable(schema.string()),
    totalItems: schema.number(),
  }),
  data: schema.arrayOf(
    schema.object({
      id: schema.string(),
      updater: schema.nullable(schema.string()),
      isAvailableForLite: schema.boolean(),
      isAvailableForArs: schema.boolean(),
      fileSize: schema.number(),
      mgmtId: schema.number(),
      scopeLevel: schema.string(),
      shortFileName: schema.string(),
      scriptName: schema.string(),
      creator: schema.string(),
      package: schema.nullable(
        schema.object({
          id: schema.string(),
          bucketName: schema.string(),
          endpointExpiration: schema.string(),
          fileName: schema.string(),
          endpointExpirationSeconds: schema.nullable(schema.number()),
          fileSize: schema.number(),
          signatureType: schema.string(),
          signature: schema.string(),
        })
      ),
      bucketName: schema.string(),
      inputRequired: schema.boolean(),
      fileName: schema.string(),
      supportedDestinations: schema.nullable(schema.arrayOf(schema.string())),
      scopeName: schema.nullable(schema.string()),
      signatureType: schema.string(),
      outputFilePaths: schema.nullable(schema.arrayOf(schema.string())),
      scriptDescription: schema.nullable(schema.string()),
      createdByUserId: schema.string(),
      scopeId: schema.string(),
      updatedAt: schema.string(),
      scriptType: schema.string(),
      scopePath: schema.string(),
      creatorId: schema.string(),
      osTypes: schema.arrayOf(schema.string()),
      scriptRuntimeTimeoutSeconds: schema.number(),
      version: schema.string(),
      updaterId: schema.nullable(schema.string()),
      createdAt: schema.string(),
      inputExample: schema.nullable(schema.string()),
      inputInstructions: schema.nullable(schema.string()),
      signature: schema.string(),
      createdByUser: schema.string(),
      requiresApproval: schema.maybe(schema.boolean()),
    })
  ),
});

export const SentinelOneExecuteScriptParamsSchema = schema.object({
  computerName: schema.maybe(schema.string()),
  script: schema.object({
    scriptId: schema.string(),
    scriptName: schema.maybe(schema.string()),
    apiKey: schema.maybe(schema.string()),
    outputDirectory: schema.maybe(schema.string()),
    requiresApproval: schema.maybe(schema.boolean()),
    taskDescription: schema.maybe(schema.string()),
    singularityxdrUrl: schema.maybe(schema.string()),
    inputParams: schema.maybe(schema.string()),
    singularityxdrKeyword: schema.maybe(schema.string()),
    scriptRuntimeTimeoutSeconds: schema.maybe(schema.number()),
    passwordFromScope: schema.maybe(
      schema.object({
        scopeLevel: schema.maybe(schema.string()),
        scopeId: schema.maybe(schema.string()),
      })
    ),
    password: schema.maybe(schema.string()),
  }),
});

export const SentinelOneGetRemoteScriptStatusParamsSchema = schema.object(
  {
    parentTaskId: schema.string(),
  },
  { unknowns: 'allow' }
);

export const SentinelOneGetRemoteScriptStatusResponseSchema = schema.object({
  pagination: schema.object({
    totalItems: schema.number(),
    nextCursor: schema.nullable(schema.string()),
  }),
  errors: schema.arrayOf(schema.object({ type: schema.string() })),
  data: schema.arrayOf(
    schema.object({
      agentIsDecommissioned: schema.boolean(),
      agentComputerName: schema.string(),
      status: schema.string(),
      groupName: schema.string(),
      initiatedById: schema.string(),
      parentTaskId: schema.string(),
      updatedAt: schema.string(),
      createdAt: schema.string(),
      agentIsActive: schema.boolean(),
      agentOsType: schema.string(),
      agentMachineType: schema.string(),
      id: schema.string(),
      siteName: schema.string(),
      detailedStatus: schema.string(),
      siteId: schema.string(),
      scriptResultsSignature: schema.nullable(schema.string()),
      initiatedBy: schema.string(),
      accountName: schema.string(),
      groupId: schema.string(),
      statusDescription: schema.object({
        readOnly: schema.boolean(),
        description: schema.string(),
      }),
      agentUuid: schema.string(),
      accountId: schema.string(),
      type: schema.string(),
      scriptResultsPath: schema.string(),
      scriptResultsBucket: schema.string(),
      description: schema.string(),
      agentId: schema.string(),
    })
  ),
});

export const SentinelOneBaseFilterSchema = schema.object({
  K8SNodeName__contains: schema.nullable(schema.string()),
  coreCount__lt: schema.nullable(schema.string()),
  rangerStatuses: schema.nullable(schema.string()),
  adUserQuery__contains: schema.nullable(schema.string()),
  rangerVersionsNin: schema.nullable(schema.string()),
  rangerStatusesNin: schema.nullable(schema.string()),
  coreCount__gte: schema.nullable(schema.string()),
  threatCreatedAt__gte: schema.nullable(schema.string()),
  decommissionedAt__lte: schema.nullable(schema.string()),
  operationalStatesNin: schema.nullable(schema.string()),
  appsVulnerabilityStatusesNin: schema.nullable(schema.string()),
  mitigationMode: schema.nullable(schema.string()),
  createdAt__gte: schema.nullable(schema.string()),
  gatewayIp: schema.nullable(schema.string()),
  cloudImage__contains: schema.nullable(schema.string()),
  registeredAt__between: schema.nullable(schema.string()),
  threatMitigationStatus: schema.nullable(schema.string()),
  installerTypesNin: schema.nullable(schema.string()),
  appsVulnerabilityStatuses: schema.nullable(schema.string()),
  threatResolved: schema.nullable(schema.string()),
  mitigationModeSuspicious: schema.nullable(schema.string()),
  isUpToDate: schema.nullable(schema.string()),
  adComputerQuery__contains: schema.nullable(schema.string()),
  updatedAt__gte: schema.nullable(schema.string()),
  azureResourceGroup__contains: schema.nullable(schema.string()),
  scanStatus: schema.nullable(schema.string()),
  threatContentHash: schema.nullable(schema.string()),
  osTypesNin: schema.nullable(schema.string()),
  threatRebootRequired: schema.nullable(schema.string()),
  totalMemory__between: schema.nullable(schema.string()),
  firewallEnabled: schema.nullable(schema.string()),
  gcpServiceAccount__contains: schema.nullable(schema.string()),
  updatedAt__gt: schema.nullable(schema.string()),
  remoteProfilingStates: schema.nullable(schema.string()),
  filteredGroupIds: schema.nullable(schema.string()),
  agentVersions: schema.nullable(schema.string()),
  activeThreats: schema.nullable(schema.string()),
  machineTypesNin: schema.nullable(schema.string()),
  lastActiveDate__gt: schema.nullable(schema.string()),
  awsSubnetIds__contains: schema.nullable(schema.string()),
  installerTypes: schema.nullable(schema.string()),
  registeredAt__gte: schema.nullable(schema.string()),
  migrationStatus: schema.nullable(schema.string()),
  cloudTags__contains: schema.nullable(schema.string()),
  totalMemory__gte: schema.nullable(schema.string()),
  decommissionedAt__lt: schema.nullable(schema.string()),
  threatCreatedAt__lt: schema.nullable(schema.string()),
  updatedAt__lte: schema.nullable(schema.string()),
  osArch: schema.nullable(schema.string()),
  registeredAt__gt: schema.nullable(schema.string()),
  registeredAt__lt: schema.nullable(schema.string()),
  siteIds: schema.nullable(schema.string()),
  networkInterfaceInet__contains: schema.nullable(schema.string()),
  groupIds: schema.nullable(schema.string()),
  uuids: schema.nullable(schema.string()),
  accountIds: schema.nullable(schema.string()),
  scanStatusesNin: schema.nullable(schema.string()),
  cpuCount__lte: schema.nullable(schema.string()),
  locationIds: schema.nullable(schema.string()),
  awsSecurityGroups__contains: schema.nullable(schema.string()),
  networkStatusesNin: schema.nullable(schema.string()),
  activeThreats__gt: schema.nullable(schema.string()),
  infected: schema.nullable(schema.string()),
  osVersion__contains: schema.nullable(schema.string()),
  machineTypes: schema.nullable(schema.string()),
  agentPodName__contains: schema.nullable(schema.string()),
  computerName__like: schema.nullable(schema.string()),
  threatCreatedAt__gt: schema.nullable(schema.string()),
  consoleMigrationStatusesNin: schema.nullable(schema.string()),
  computerName: schema.nullable(schema.string()),
  decommissionedAt__between: schema.nullable(schema.string()),
  cloudInstanceId__contains: schema.nullable(schema.string()),
  createdAt__lte: schema.nullable(schema.string()),
  coreCount__between: schema.nullable(schema.string()),
  totalMemory__lte: schema.nullable(schema.string()),
  remoteProfilingStatesNin: schema.nullable(schema.string()),
  adComputerMember__contains: schema.nullable(schema.string()),
  threatCreatedAt__between: schema.nullable(schema.string()),
  totalMemory__gt: schema.nullable(schema.string()),
  ids: schema.nullable(schema.string()),
  agentVersionsNin: schema.nullable(schema.string()),
  updatedAt__between: schema.nullable(schema.string()),
  locationEnabled: schema.nullable(schema.string()),
  locationIdsNin: schema.nullable(schema.string()),
  osTypes: schema.nullable(schema.string()),
  encryptedApplications: schema.nullable(schema.string()),
  filterId: schema.nullable(schema.string()),
  decommissionedAt__gt: schema.nullable(schema.string()),
  adUserMember__contains: schema.nullable(schema.string()),
  uuid: schema.nullable(schema.string()),
  coreCount__lte: schema.nullable(schema.string()),
  coreCount__gt: schema.nullable(schema.string()),
  cloudNetwork__contains: schema.nullable(schema.string()),
  clusterName__contains: schema.nullable(schema.string()),
  cpuCount__gte: schema.nullable(schema.string()),
  query: schema.nullable(schema.string()),
  lastActiveDate__between: schema.nullable(schema.string()),
  rangerStatus: schema.nullable(schema.string()),
  domains: schema.nullable(schema.string()),
  cloudProvider: schema.nullable(schema.string()),
  lastActiveDate__lt: schema.nullable(schema.string()),
  scanStatuses: schema.nullable(schema.string()),
  hasLocalConfiguration: schema.nullable(schema.string()),
  networkStatuses: schema.nullable(schema.string()),
  isPendingUninstall: schema.nullable(schema.string()),
  createdAt__gt: schema.nullable(schema.string()),
  cpuCount__lt: schema.nullable(schema.string()),
  consoleMigrationStatuses: schema.nullable(schema.string()),
  adQuery: schema.nullable(schema.string()),
  updatedAt__lt: schema.nullable(schema.string()),
  createdAt__lt: schema.nullable(schema.string()),
  adComputerName__contains: schema.nullable(schema.string()),
  cloudInstanceSize__contains: schema.nullable(schema.string()),
  registeredAt__lte: schema.nullable(schema.string()),
  networkQuarantineEnabled: schema.nullable(schema.string()),
  cloudAccount__contains: schema.nullable(schema.string()),
  cloudLocation__contains: schema.nullable(schema.string()),
  rangerVersions: schema.nullable(schema.string()),
  networkInterfaceGatewayMacAddress__contains: schema.nullable(schema.string()),
  uuid__contains: schema.nullable(schema.string()),
  agentNamespace__contains: schema.nullable(schema.string()),
  K8SNodeLabels__contains: schema.nullable(schema.string()),
  adQuery__contains: schema.nullable(schema.string()),
  K8SType__contains: schema.nullable(schema.string()),
  countsFor: schema.nullable(schema.string()),
  totalMemory__lt: schema.nullable(schema.string()),
  externalId__contains: schema.nullable(schema.string()),
  filteredSiteIds: schema.nullable(schema.string()),
  decommissionedAt__gte: schema.nullable(schema.string()),
  cpuCount__gt: schema.nullable(schema.string()),
  threatHidden: schema.nullable(schema.string()),
  isUninstalled: schema.nullable(schema.string()),
  computerName__contains: schema.nullable(schema.string()),
  lastActiveDate__lte: schema.nullable(schema.string()),
  adUserName__contains: schema.nullable(schema.string()),
  isActive: schema.nullable(schema.string()),
  userActionsNeeded: schema.nullable(schema.string()),
  threatCreatedAt__lte: schema.nullable(schema.string()),
  domainsNin: schema.nullable(schema.string()),
  operationalStates: schema.nullable(schema.string()),
  externalIp__contains: schema.nullable(schema.string()),
  isDecommissioned: schema.nullable(schema.string()),
  networkInterfacePhysical__contains: schema.nullable(schema.string()),
  lastActiveDate__gte: schema.nullable(schema.string()),
  createdAt__between: schema.nullable(schema.string()),
  cpuCount__between: schema.nullable(schema.string()),
  lastLoggedInUserName__contains: schema.nullable(schema.string()),
  awsRole__contains: schema.nullable(schema.string()),
  K8SVersion__contains: schema.nullable(schema.string()),
});

export const SentinelOneKillProcessParamsSchema = SentinelOneBaseFilterSchema.extends({
  processName: schema.string(),
});

export const SentinelOneIsolateAgentParamsSchema = SentinelOneBaseFilterSchema;

export const SentinelOneGetAgentsParamsSchema = SentinelOneBaseFilterSchema;

export const SentinelOneGetRemoteScriptsStatusParams = schema.object({
  parentTaskId: schema.string(),
});

export const SentinelOneExecuteScriptResponseSchema = schema.object({
  errors: schema.nullable(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
  data: schema.nullable(
    schema.object({
      pendingExecutionId: schema.nullable(schema.string()),
      affected: schema.nullable(schema.number()),
      parentTaskId: schema.nullable(schema.string()),
      pending: schema.nullable(schema.boolean()),
    })
  ),
});

export const SentinelOneKillProcessResponseSchema = SentinelOneExecuteScriptResponseSchema;

export const SentinelOneKillProcessSchema = schema.object({
  subAction: schema.literal(SUB_ACTION.KILL_PROCESS),
  subActionParams: SentinelOneKillProcessParamsSchema,
});

export const SentinelOneIsolateAgentSchema = schema.object({
  subAction: schema.literal(SUB_ACTION.ISOLATE_AGENT),
  subActionParams: SentinelOneIsolateAgentParamsSchema,
});

export const SentinelOneReleaseAgentSchema = schema.object({
  subAction: schema.literal(SUB_ACTION.RELEASE_AGENT),
  subActionParams: SentinelOneIsolateAgentParamsSchema,
});

export const SentinelOneExecuteScriptSchema = schema.object({
  subAction: schema.literal(SUB_ACTION.EXECUTE_SCRIPT),
  subActionParams: SentinelOneExecuteScriptParamsSchema,
});

export const SentinelOneActionParamsSchema = schema.oneOf([
  SentinelOneKillProcessSchema,
  SentinelOneIsolateAgentSchema,
  SentinelOneReleaseAgentSchema,
  SentinelOneExecuteScriptSchema,
]);
