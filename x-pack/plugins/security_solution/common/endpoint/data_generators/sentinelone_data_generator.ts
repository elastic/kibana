/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import type { SearchResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type {
  SentinelOneGetActivitiesResponse,
  SentinelOneGetAgentsResponse,
} from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import { EndpointActionGenerator } from './endpoint_action_generator';
import { SENTINEL_ONE_ACTIVITY_INDEX_PATTERN } from '../..';
import type {
  LogsEndpointAction,
  SentinelOneActivityEsDoc,
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
} from '../types';

export class SentinelOneDataGenerator extends EndpointActionGenerator {
  generate<
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TMeta extends {} = {}
  >(
    overrides: DeepPartial<LogsEndpointAction<TParameters, TOutputContent, TMeta>> = {}
  ): LogsEndpointAction<TParameters, TOutputContent, TMeta> {
    return super.generate({
      EndpointActions: {
        input_type: 'sentinel_one',
      },
      ...overrides,
    }) as LogsEndpointAction<TParameters, TOutputContent, TMeta>;
  }

  /** Generate a SentinelOne activity index ES doc */
  generateActivityEsDoc(
    overrides: DeepPartial<SentinelOneActivityEsDoc> = {}
  ): SentinelOneActivityEsDoc {
    const doc: SentinelOneActivityEsDoc = {
      sentinel_one: {
        activity: {
          agent: {
            id: this.seededUUIDv4(),
          },
          updated_at: '2024-03-29T13:45:21.723Z',
          description: {
            primary: 'Some description here',
          },
          id: this.seededUUIDv4(),
          type: 1001,
        },
      },
    };

    return merge(doc, overrides);
  }

  generateActivityEsSearchHit(
    overrides: DeepPartial<SentinelOneActivityEsDoc> = {}
  ): SearchHit<SentinelOneActivityEsDoc> {
    const hit = this.toEsSearchHit<SentinelOneActivityEsDoc>(
      this.generateActivityEsDoc(overrides),
      SENTINEL_ONE_ACTIVITY_INDEX_PATTERN
    );

    hit.inner_hits = {
      first_found: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        hits: { hits: [this.toEsSearchHit(hit._source!, hit._index)] },
      },
    };

    return hit;
  }

  generateActivityEsSearchResponse(
    docs: Array<SearchHit<SentinelOneActivityEsDoc>> = [this.generateActivityEsSearchHit()]
  ): SearchResponse<SentinelOneActivityEsDoc> {
    return this.toEsSearchResponse<SentinelOneActivityEsDoc>(docs);
  }

  generateSentinelOneApiActivityResponse(): SentinelOneGetActivitiesResponse {
    const today = new Date().toISOString();

    return {
      data: [
        {
          accountId: this.randomString(10),
          accountName: 'Elastic',
          activityType: 81,
          activityUuid: this.seededUUIDv4(),
          agentId: this.seededUUIDv4(),
          agentUpdatedVersion: null,
          comments: null,
          createdAt: today,
          data: {
            accountName: 'Elastic',
            commandBatchUuid: '736dabe5-5848-4078-8825-d3a41dc85696',
            computerName: 'host-sentinelone-1371',
            externalIp: '108.77.84.191',
            fullScopeDetails: 'Group Default Group in Site Default site of Account Elastic',
            fullScopeDetailsPath: 'Global / Elastic / Default site / Default Group',
            groupName: 'Default Group',
            groupType: 'Manual',
            ipAddress: '108.77.84.191',
            scopeLevel: 'Group',
            scopeName: 'Default Group',
            siteName: 'Default site',
            username: 'Defend Workflows Automation',
            uuid: 'c06d63d9-9fa2-046d-e91e-dc94cf6695d8',
          },
          description: null,
          groupId: '1392053568591146999',
          groupName: 'Default Group',
          hash: null,
          id: this.seededUUIDv4(),
          osFamily: null,
          primaryDescription:
            'The management user Defend Workflows Automation initiated a fetch file command to the agent host-sentinelone-1371 (108.77.84.191).',
          secondaryDescription: 'IP address: 108.77.84.191',
          siteId: '1392053568582758390',
          siteName: 'Default site',
          threatId: null,
          updatedAt: '2024-05-01T20:19:25.165053Z',
          userId: this.randomUser(),
        },
      ],
      pagination: {
        nextCursor: 'eyJpZF9jb2x9',
        totalItems: 1,
      },
    };
  }

  generateSentinelOneApiAgentsResponse(
    agentDetailsOverrides: DeepPartial<SentinelOneGetAgentsResponse['data'][number]> = {}
  ): SentinelOneGetAgentsResponse {
    const id = agentDetailsOverrides.id || agentDetailsOverrides.uuid || this.seededUUIDv4();

    const agent: SentinelOneGetAgentsResponse['data'][number] = {
      accountId: this.seededUUIDv4(),
      accountName: 'Elastic',
      activeDirectory: {
        computerDistinguishedName: null,
        computerMemberOf: [],
        lastUserDistinguishedName: null,
        lastUserMemberOf: [],
        mail: null,
        userPrincipalName: null,
      },
      activeThreats: 0,
      agentVersion: '23.4.2.14',
      allowRemoteShell: true,
      appsVulnerabilityStatus: 'not_applicable',
      cloudProviders: {},
      computerName: this.randomHostname(),
      consoleMigrationStatus: 'N/A',
      coreCount: 1,
      cpuCount: 1,
      cpuId: 'ARM Cortex-A72',
      createdAt: this.randomPastDate(),
      detectionState: null,
      domain: 'unknown',
      encryptedApplications: false,
      externalId: '',
      externalIp: this.randomIP(),
      firewallEnabled: false,
      firstFullModeTime: null,
      fullDiskScanLastUpdatedAt: this.randomPastDate(),
      groupId: '1392053568591146999',
      groupIp: '108.77.84.x',
      groupName: 'Default Group',
      id,
      inRemoteShellSession: false,
      infected: false,
      installerType: '.deb',
      isActive: true,
      isDecommissioned: false,
      isPendingUninstall: false,
      isUninstalled: false,
      isUpToDate: true,
      lastActiveDate: this.randomPastDate(),
      lastIpToMgmt: this.randomIP(),
      lastLoggedInUserName: '',
      licenseKey: '',
      locationEnabled: false,
      locationType: 'not_supported',
      locations: null,
      machineType: 'server',
      mitigationMode: 'detect',
      mitigationModeSuspicious: 'detect',
      modelName: 'QEMU QEMU Virtual Machine',
      policyUpdatedAt: null,
      groupUpdatedAt: null,
      networkInterfaces: [
        {
          gatewayIp: '192.168.64.1',
          gatewayMacAddress: 'be:d0:74:50:d8:64',
          id: '1913920934593053818',
          inet: ['192.168.64.2'],
          inet6: ['fdf4:f033:b1d4:8c51:5054:ff:fe5b:15e7'],
          name: 'enp0s1',
          physical: '52:54:00:5B:15:E7',
        },
      ],
      networkQuarantineEnabled: false,
      networkStatus: 'connected',
      operationalState: 'na',
      operationalStateExpiration: null,
      osArch: '64 bit',
      osName: 'Linux',
      osRevision: 'Ubuntu 22.04.4 LTS 5.15.0-102-generic',
      osStartTime: '2024-04-16T22:48:33Z',
      osType: 'linux',
      osUsername: 'root',
      rangerStatus: 'Enabled',
      rangerVersion: '23.4.1.1',
      registeredAt: '2024-03-25T16:59:14.860010Z',
      remoteProfilingState: 'disabled',
      remoteProfilingStateExpiration: null,
      scanAbortedAt: null,
      scanFinishedAt: '2024-03-25T17:21:43.371381Z',
      scanStartedAt: '2024-03-25T17:00:19.774123Z',
      scanStatus: 'finished',
      serialNumber: null,
      showAlertIcon: false,
      siteId: '1392053568582758390',
      siteName: 'Default site',
      storageName: null,
      storageType: null,
      tags: { sentinelone: [] },
      threatRebootRequired: false,
      totalMemory: 1966,
      updatedAt: this.randomPastDate(),
      userActionsNeeded: [],
      uuid: id,
    };

    return {
      pagination: { totalItems: 1, nextCursor: null },
      data: [merge(agent, agentDetailsOverrides)],
      errors: null,
    };
  }
}
