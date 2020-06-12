/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';

import { ActionsConfigurationUtilities } from '../../actions_config';
import {
  ExternalIncidentServiceConfiguration,
  ExternalIncidentServiceSecretConfiguration,
} from './types';

import * as i18n from './translations';

export const validateCommonConfig = (
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: ExternalIncidentServiceConfiguration
) => {
  try {
    if (isEmpty(configObject.casesConfiguration.mapping)) {
      return i18n.MAPPING_EMPTY;
    }

    configurationUtilities.ensureWhitelistedUri(configObject.apiUrl);
  } catch (whitelistError) {
    return i18n.WHITE_LISTED_ERROR(whitelistError.message);
  }
};

export const validateCommonSecrets = (
  configurationUtilities: ActionsConfigurationUtilities,
  secrets: ExternalIncidentServiceSecretConfiguration
) => {};
