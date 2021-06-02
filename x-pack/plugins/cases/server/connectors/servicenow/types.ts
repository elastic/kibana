/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceNowITSMFieldsType } from '../../../common/api';
import { CaseConnector } from '../types';

export interface ServiceNowSIRFieldsType {
  dest_ip: string | null;
  source_ip: string | null;
  category: string | null;
  subcategory: string | null;
  malware_hash: string | null;
  malware_url: string | null;
  priority: string | null;
}

export type SirFieldKey = 'dest_ip' | 'source_ip' | 'malware_hash' | 'malware_url';
export type AlertFieldMappingAndValues = Record<
  string,
  { alertPath: string; sirFieldKey: SirFieldKey; add: boolean }
>;

// ServiceNow ITSM
export type ServiceNowITSMCaseConnector = CaseConnector<ServiceNowITSMFieldsType>;
export type ServiceNowITSMFormat = CaseConnector<ServiceNowITSMFieldsType>['format'];
export type ServiceNowITSMGetMapping = CaseConnector<ServiceNowITSMFieldsType>['getMapping'];

// ServiceNow SIR
export type ServiceNowSIRCaseConnector = CaseConnector<ServiceNowSIRFieldsType>;
export type ServiceNowSIRFormat = CaseConnector<ServiceNowSIRFieldsType>['format'];
export type ServiceNowSIRGetMapping = CaseConnector<ServiceNowSIRFieldsType>['getMapping'];
