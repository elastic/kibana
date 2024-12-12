/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';

import {
  MicrosoftDefenderEndpointSecretsSchema,
  MicrosoftDefenderEndpointConfigSchema,
  MicrosoftDefenderEndpointActionParamsSchema,
  MicrosoftDefenderEndpointBaseApiResponseSchema,
  IsolateHostParamsSchema,
  ReleaseHostParamsSchema,
  TestConnectorParamsSchema,
  AgentDetailsParamsSchema,
} from './schema';

export type MicrosoftDefenderEndpointConfig = TypeOf<typeof MicrosoftDefenderEndpointConfigSchema>;

export type MicrosoftDefenderEndpointSecrets = TypeOf<
  typeof MicrosoftDefenderEndpointSecretsSchema
>;

export type MicrosoftDefenderEndpointBaseApiResponse = TypeOf<
  typeof MicrosoftDefenderEndpointBaseApiResponseSchema
>;

export type MicrosoftDefenderEndpointAgentDetailsParams = TypeOf<typeof AgentDetailsParamsSchema>;

/**
 * @see https://learn.microsoft.com/en-us/defender-endpoint/api/machine
 */
export interface MicrosoftDefenderEndpointAgentDetails {
  /** machine identity. */
  id: string;
  /** machine fully qualified name. */
  computerDnsName: string;
  /** First date and time where the machine was observed by Microsoft Defender for Endpoint. */
  firstSeen: string;
  /** Time and date of the last received full device report. A device typically sends a full report every 24 hours.  NOTE: This property doesn't correspond to the last seen value in the UI. It pertains to the last device update. */
  lastSeen: string;
  /** Operating system platform. */
  osPlatform: string;
  /** Status of machine onboarding. Possible values are: onboarded, CanBeOnboarded, Unsupported, and InsufficientInfo. */
  onboardingstatus: string;
  /** Operating system processor. Use osArchitecture property instead. */
  osProcessor: string;
  /** Operating system Version. */
  version: string;
  /** Operating system build number. */
  osBuild?: number;
  /** Last IP on local NIC on the machine. */
  lastIpAddress: string;
  /** Last IP through which the machine accessed the internet. */
  lastExternalIpAddress: string;
  /** machine health status. Possible values are: Active, Inactive, ImpairedCommunication, NoSensorData, NoSensorDataImpairedCommunication, and Unknown. */
  healthStatus:
    | 'Active'
    | 'Inactive'
    | 'ImpairedCommunication'
    | 'NoSensorData'
    | 'NoSensorDataImpairedCommunication'
    | 'Unknown';
  /** Machine group Name. */
  rbacGroupName: string;
  /** Machine group ID. */
  rbacGroupId: string;
  /** Risk score as evaluated by Microsoft Defender for Endpoint. Possible values are: None, Informational, Low, Medium, and High. */
  riskScore?: 'None' | 'Informational' | 'Low' | 'Medium' | 'High';
  /** Microsoft Entra Device ID (when machine is Microsoft Entra joined). */
  aadDeviceId?: string;
  /** Set of machine tags. */
  machineTags: string[];
  /** Exposure level as evaluated by Microsoft Defender for Endpoint. Possible values are: None, Low, Medium, and High. */
  exposureLevel?: 'None' | 'Low' | 'Medium' | 'High';
  /** The value of the device. Possible values are: Normal, Low, and High. */
  deviceValue?: 'Normal' | 'Low' | 'High';
  /** Set of IpAddress objects. See Get machines API. */
  ipAddresses: string[];
  /** Operating system architecture. Possible values are: 32-bit, 64-bit. Use this property instead of osProcessor. */
  osArchitecture: string;
}

export type MicrosoftDefenderEndpointTestConnectorParams = TypeOf<typeof TestConnectorParamsSchema>;

export type MicrosoftDefenderEndpointIsolateHostParams = TypeOf<typeof IsolateHostParamsSchema>;

export type MicrosoftDefenderEndpointReleaseHostParams = TypeOf<typeof ReleaseHostParamsSchema>;

export type MicrosoftDefenderEndpointActionParams = TypeOf<
  typeof MicrosoftDefenderEndpointActionParamsSchema
>;

export interface MicrosoftDefenderEndpointApiTokenResponse {
  token_type: 'bearer';
  /** 	The amount of time that an access token is valid (in seconds NOT milliseconds). */
  expires_in: number;
  access_token: string;
}
