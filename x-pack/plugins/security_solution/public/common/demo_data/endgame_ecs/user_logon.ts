/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

export const demoEndgameUserLogon: Ecs = {
  _id: 'QsjPcG0BOpWiDweSeuRE',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['10.0'],
    },
    ip: ['10.134.159.150'],
    name: ['HD-v1s-d2118419'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['user_logon'],
    category: ['authentication'],
    type: ['authentication_success'],
    kind: ['event'],
  },
  message: [
    'An account was successfully logged on.\r\n\r\nSubject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tWIN-Q3DOP1UKA81$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3e7\r\n\r\nLogon Type:\t\t\t5\r\n\r\nNew Logon:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tSYSTEM\r\n\tAccount Domain:\t\tNT AUTHORITY\r\n\tLogon ID:\t\t0x3e7\r\n\tLogon GUID:\t\t{00000000-0000-0000-0000-000000000000}\r\n\r\nProcess Information:\r\n\tProcess ID:\t\t0x1b0\r\n\tProcess Name:\t\tC:\\Windows\\System32\\services.exe\r\n\r\nNetwork Information:\r\n\tWorkstation Name:\t\r\n\tSource Network Address:\t-\r\n\tSource Port:\t\t-\r\n\r\nDetailed Authentication Information:\r\n\tLogon Process:\t\tAdvapi  \r\n\tAuthentication Package:\tNegotiate\r\n\tTransited Services:\t-\r\n\tPackage Name (NTLM only):\t-\r\n\tKey Length:\t\t0\r\n\r\nThis event is generated when a logon session is created. It is generated on the computer that was accessed.\r\n\r\nThe subject fields indicate the account on the local system which requested the logon. This is most commonly a service such as the Server service, or a local process such as Winlogon.exe or Services.exe.\r\n\r\nThe logon type field indicates the kind of logon that occurred. The most common types are 2 (interactive) and 3 (network).\r\n\r\nThe New Logon fields indicate the account for whom the new logon was created, i.e. the account that was logged on.\r\n\r\nThe network fields indicate where a remote logon request originated. Workstation name is not always available and may be left blank in some cases.\r\n\r\nThe authentication information fields provide detailed information about this specific logon request.\r\n\t- Logon GUID is a unique identifier that can be used to correlate this event with a KDC event.\r\n\t- Transited services indicate which intermediate services have participated in this logon request.\r\n\t- Package name indicates which sub-protocol was used among the NTLM protocols.\r\n\t- Key length indicates the length of the generated session key. This will be 0 if no session key was requested.',
  ],
  timestamp: '1569555704000',
  process: {
    pid: [432],
    name: ['C:\\Windows\\System32\\services.exe'],
    executable: ['C:\\Windows\\System32\\services.exe'],
  },
  winlog: {
    event_id: [4624],
  },
  endgame: {
    target_logon_id: ['0x3e7'],
    pid: [432],
    process_name: ['C:\\Windows\\System32\\services.exe'],
    logon_type: [5],
    subject_user_name: ['WIN-Q3DOP1UKA81$'],
    subject_logon_id: ['0x3e7'],
    target_user_name: ['SYSTEM'],
    target_domain_name: ['NT AUTHORITY'],
  },
};
