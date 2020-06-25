/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNillEmptyOrNotFinite } from '../helpers';

import * as i18n from './translations';

export const getHumanReadableLogonType = (endgameLogonType: number | null | undefined): string => {
  if (isNillEmptyOrNotFinite(endgameLogonType)) {
    return '';
  }

  switch (endgameLogonType) {
    case 2:
      return i18n.LOGON_TYPE_INTERACTIVE;
    case 3:
      return i18n.LOGON_TYPE_NETWORK;
    case 4:
      return i18n.LOGON_TYPE_BATCH;
    case 5:
      return i18n.LOGON_TYPE_SERVICE;
    case 7:
      return i18n.LOGON_TYPE_UNLOCK;
    case 8:
      return i18n.LOGON_TYPE_NETWORK_CLEARTEXT;
    case 9:
      return i18n.LOGON_TYPE_NEW_CREDENTIALS;
    case 10:
      return i18n.LOGON_TYPE_REMOTE_INTERACTIVE;
    case 11:
      return i18n.LOGON_TYPE_CACHED_INTERACTIVE;
    default:
      return `${endgameLogonType}`;
  }
};

export const getHostNameSeparator = (eventAction: string | null | undefined): string =>
  eventAction === 'explicit_user_logon' ? i18n.TO : '@';

export const getTargetUserAndTargetDomain = (eventAction: string | null | undefined): boolean =>
  eventAction === 'explicit_user_logon' || eventAction === 'user_logoff';

export const getUserDomainField = (eventAction: string | null | undefined): string =>
  getTargetUserAndTargetDomain(eventAction) ? 'endgame.target_domain_name' : 'user.domain';

export const getUserNameField = (eventAction: string | null | undefined): string =>
  getTargetUserAndTargetDomain(eventAction) ? 'endgame.target_user_name' : 'user.name';

export const getEventDetails = (eventAction: string | null | undefined): string => {
  switch (eventAction) {
    case 'explicit_user_logon':
      return ''; // no details
    case 'user_logoff':
      return i18n.LOGGED_OFF;
    default:
      return i18n.SUCCESSFULLY_LOGGED_IN;
  }
};
