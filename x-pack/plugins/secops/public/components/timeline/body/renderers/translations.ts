/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TCP = i18n.translate('xpack.secops.timeline.tcp', {
  defaultMessage: 'TCP',
});

export const DESTINATION = i18n.translate('xpack.secops.timeline.destination', {
  defaultMessage: 'Destination',
});

export const PROTOCOL = i18n.translate('xpack.secops.timeline.protocol', {
  defaultMessage: 'Protocol',
});

export const SOURCE = i18n.translate('xpack.secops.timeline.source', {
  defaultMessage: 'Source',
});

// English Text for these codes are shortened from
// https://docs.zeek.org/en/stable/scripts/base/protocols/conn/main.bro.html
export const S0 = i18n.translate('xpack.secops.zeek.s0Description', {
  defaultMessage: 'Connection attempt seen, no reply',
});

export const S1 = i18n.translate('xpack.secops.zeek.s1Description', {
  defaultMessage: 'Connection established, not terminated',
});

export const S2 = i18n.translate('xpack.secops.zeek.s2Description', {
  defaultMessage:
    'Connection established and close attempt by originator seen (but no reply from responder)',
});

export const S3 = i18n.translate('xpack.secops.zeek.s3Description', {
  defaultMessage:
    'Connection established and close attempt by responder seen (but no reply from originator)',
});

export const SF = i18n.translate('xpack.secops.zeek.sfDescription', {
  defaultMessage: 'Normal SYN/FIN completion',
});

export const REJ = i18n.translate('xpack.secops.zeek.rejDescription', {
  defaultMessage: 'Connection attempt rejected',
});

export const RSTO = i18n.translate('xpack.secops.zeek.rstoODescription', {
  defaultMessage: 'Connection established, originator aborted (sent a RST)',
});

export const RSTR = i18n.translate('xpack.secops.zeek.rstrDescription', {
  defaultMessage: 'Established, responder aborted',
});

export const RSTOS0 = i18n.translate('xpack.secops.zeek.rstosoDescription', {
  defaultMessage: 'Originator sent a SYN followed by a RST, no SYN-ACK from the responder',
});

export const RSTRH = i18n.translate('xpack.secops.zeek.rstrhDescription', {
  defaultMessage:
    'Responder sent a SYN ACK followed by a RST, no SYN from the (purported) originator',
});

export const SH = i18n.translate('xpack.secops.zeek.shDescription', {
  defaultMessage: 'Originator sent a SYN followed by a FIN, no SYN ACK from the responder',
});

export const SHR = i18n.translate('xpack.secops.zeek.shrDescription', {
  defaultMessage: 'Responder sent a SYN ACK followed by a FIN, no SYN from the originator',
});

export const OTH = i18n.translate('xpack.secops.zeek.othDescription', {
  defaultMessage: 'No SYN seen, just midstream traffic',
});

export const SESSION = i18n.translate('xpack.secops.auditd.sessionDescription', {
  defaultMessage: 'Session',
});

export const IN = i18n.translate('xpack.secops.auditd.disposed.inDescription', {
  defaultMessage: 'in',
});

export const ENDED_FROM = i18n.translate('xpack.secops.auditd.endedsession.endedFromDescription', {
  defaultMessage: 'ended from',
});

export const DISPOSED_CREDENTIALS_TO = i18n.translate(
  'xpack.secops.auditd.disposed.credentialsDescription',
  {
    defaultMessage: 'disposed credentials to',
  }
);

export const EXECUTED = i18n.translate('xpack.secops.auditd.executed.executedDescription', {
  defaultMessage: 'executed',
});

export const ATTEMPTED_LOGIN = i18n.translate('xpack.secops.auditd.loggedin.attemptedDescription', {
  defaultMessage: 'attempted a login via',
});

export const WITH_RESULT = i18n.translate('xpack.secops.auditd.loggedin.withResultDescription', {
  defaultMessage: 'with result',
});
