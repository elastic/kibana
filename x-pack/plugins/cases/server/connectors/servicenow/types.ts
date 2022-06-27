/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceNowITSMFieldsType } from '../../../common/api';
import { ICasesConnector } from '../types';

interface CorrelationValues {
  correlation_id: string | null;
  correlation_display: string | null;
}

export interface ServiceNowSIRFieldsType extends CorrelationValues {
  dest_ip: string[] | null;
  source_ip: string[] | null;
  category: string | null;
  subcategory: string | null;
  malware_hash: string[] | null;
  malware_url: string[] | null;
  priority: string | null;
}

export type SirFieldKey = 'dest_ip' | 'source_ip' | 'malware_hash' | 'malware_url';
export type AlertFieldMappingAndValues = Record<
  string,
  { alertPath: string; sirFieldKey: SirFieldKey; add: boolean }
>;

// ServiceNow ITSM
export type ServiceNowITSMCasesConnector = ICasesConnector<ServiceNowITSMFieldsType>;
export type ServiceNowITSMFormat = ICasesConnector<
  ServiceNowITSMFieldsType & CorrelationValues
>['format'];
export type ServiceNowITSMGetMapping = ICasesConnector<ServiceNowITSMFieldsType>['getMapping'];

// ServiceNow SIR
export type ServiceNowSIRCasesConnector = ICasesConnector<ServiceNowSIRFieldsType>;
export type ServiceNowSIRFormat = ICasesConnector<ServiceNowSIRFieldsType>['format'];
export type ServiceNowSIRGetMapping = ICasesConnector<ServiceNowSIRFieldsType>['getMapping'];
