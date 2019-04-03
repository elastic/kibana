/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

// TODO: Change this text
// Note for translators and programmers
// Examples of these strings are all of the form
// Session {session.id} {primary} as {secondary}@{hostname} in {folder} was authorized to use {executable} with result {result.success/failure}
// E.x. Session 5 Frank as root@server-1 in /root was authorized to use wget with result success

// However, the strings can be dropped depending on the circumstances of the variables. For example, with no data at all
// Session 10
// Example with just a user name and hostname
// Session 20 frank@server-1
// Example with user name, hostname, but no result
// Session 20 frank@server-1 acquired credentials to curl

export const SESSION = i18n.translate('xpack.siem.system.systemDescription', {
  defaultMessage: 'System',
});

export const IN = i18n.translate('xpack.siem.auditd.inDescription', {
  defaultMessage: 'in',
});

export const WITH_RESULT = i18n.translate('xpack.siem.system.withResultDescription', {
  defaultMessage: 'with result',
});

export const WAS_AUTHORIZED_TO_USE = i18n.translate(
  'xpack.siem.system.wasAuthorizedToUseDescription',
  {
    defaultMessage: 'was authorized to use',
  }
);

export const ATTEMPTED_LOGIN = i18n.translate('xpack.siem.system.attemptedLoginDescription', {
  defaultMessage: 'attempted a login via',
});

export const LOGGED_OUT = i18n.translate('xpack.siem.system.loggedOutDescription', {
  defaultMessage: 'logged out via',
});

export const USING = i18n.translate('xpack.siem.system.usingDescription', {
  defaultMessage: 'using',
});

export const PROCESS_STARTED = i18n.translate('xpack.siem.system.startedProcessDescription', {
  defaultMessage: 'started process',
});
