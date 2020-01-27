/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ILicense, LICENSE_CHECK_STATE } from '../../licensing/common/types';
import { assertNever } from '../../../../src/core/utils';

export interface GraphLicenseInformation {
  showAppLink: boolean;
  enableAppLink: boolean;
  message: string;
}

export function checkLicense(license: ILicense | undefined): GraphLicenseInformation {
  if (!license || !license.isAvailable) {
    return {
      showAppLink: true,
      enableAppLink: false,
      message: i18n.translate(
        'xpack.graph.serverSideErrors.unavailableLicenseInformationErrorMessage',
        {
          defaultMessage:
            'Graph is unavailable - license information is not available at this time.',
        }
      ),
    };
  }

  const graphFeature = license.getFeature('graph');
  if (!graphFeature.isEnabled) {
    return {
      showAppLink: false,
      enableAppLink: false,
      message: i18n.translate('xpack.graph.serverSideErrors.unavailableGraphErrorMessage', {
        defaultMessage: 'Graph is unavailable',
      }),
    };
  }

  const check = license.check('graph', 'platinum');

  switch (check.state) {
    case LICENSE_CHECK_STATE.Expired:
      return {
        showAppLink: true,
        enableAppLink: false,
        message: check.message || '',
      };
    case LICENSE_CHECK_STATE.Invalid:
    case LICENSE_CHECK_STATE.Unavailable:
      return {
        showAppLink: false,
        enableAppLink: false,
        message: check.message || '',
      };
    case LICENSE_CHECK_STATE.Valid:
      return {
        showAppLink: true,
        enableAppLink: true,
        message: '',
      };
    default:
      return assertNever(check.state);
  }
}
