/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RowRendererId } from '../../../../../common/types/timeline';
import * as i18n from './translations';

export const eventRendererNames: { [key in RowRendererId]: string } = {
  [RowRendererId.alert]: i18n.ALERT_NAME,
  [RowRendererId.alerts]: i18n.ALERTS_NAME,
  [RowRendererId.auditd]: i18n.AUDITD_NAME,
  [RowRendererId.auditd_file]: i18n.AUDITD_FILE_NAME,
  [RowRendererId.library]: i18n.LIBRARY_NAME,
  [RowRendererId.system_security_event]: i18n.AUTHENTICATION_NAME,
  [RowRendererId.system_dns]: i18n.DNS_NAME,
  [RowRendererId.netflow]: i18n.FLOW_NAME,
  [RowRendererId.system]: i18n.SYSTEM_NAME,
  [RowRendererId.system_endgame_process]: i18n.PROCESS,
  [RowRendererId.registry]: i18n.REGISTRY_NAME,
  [RowRendererId.system_fim]: i18n.FIM_NAME,
  [RowRendererId.system_file]: i18n.FILE_NAME,
  [RowRendererId.system_socket]: i18n.SOCKET_NAME,
  [RowRendererId.suricata]: 'Suricata',
  [RowRendererId.threat_match]: i18n.THREAT_MATCH_NAME,
  [RowRendererId.zeek]: i18n.ZEEK_NAME,
  [RowRendererId.plain]: '',
};
