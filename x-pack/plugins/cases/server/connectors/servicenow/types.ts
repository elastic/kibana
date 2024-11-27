/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ICasesConnector } from '../types';

interface CorrelationValues {
  correlation_id: string | null;
  correlation_display: string | null;
}

// ServiceNow SIR
export interface ServiceNowSIRFieldsType extends CorrelationValues {
  dest_ip: string[] | null;
  source_ip: string[] | null;
  category: string | null;
  subcategory: string | null;
  malware_hash: string[] | null;
  malware_url: string[] | null;
  priority: string | null;
  additional_fields: string | null;
}

export type SirFieldKey = 'dest_ip' | 'source_ip' | 'malware_hash' | 'malware_url';
export type AlertFieldMappingAndValues = Record<
  string,
  { alertPath: string; sirFieldKey: SirFieldKey; add: boolean }
>;

// ServiceNow ITSM
export interface ServiceNowSIRFieldsTypeConnector extends CorrelationValues {
  impact: string | null;
  severity: string | null;
  urgency: string | null;
  category: string | null;
  subcategory: string | null;
  additional_fields: string | null;
}

export type ServiceNowITSMCasesConnector = ICasesConnector<ServiceNowSIRFieldsTypeConnector>;
export type ServiceNowITSMFormat = ICasesConnector<ServiceNowSIRFieldsTypeConnector>['format'];
export type ServiceNowITSMGetMapping =
  ICasesConnector<ServiceNowSIRFieldsTypeConnector>['getMapping'];

// ServiceNow SIR
export type ServiceNowSIRCasesConnector = ICasesConnector<ServiceNowSIRFieldsType>;
export type ServiceNowSIRFormat = ICasesConnector<ServiceNowSIRFieldsType>['format'];
export type ServiceNowSIRGetMapping = ICasesConnector<ServiceNowSIRFieldsType>['getMapping'];
