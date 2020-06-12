/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ILicense } from '../../licensing/common/types';

// Can be used in switch statements to ensure we perform exhaustive checks, see
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#exhaustiveness-checking
export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${x}`);
}

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
    case 'expired':
      return {
        showAppLink: true,
        enableAppLink: false,
        message: check.message || '',
      };
    case 'invalid':
    case 'unavailable':
      return {
        showAppLink: false,
        enableAppLink: false,
        message: check.message || '',
      };
    case 'valid':
      return {
        showAppLink: true,
        enableAppLink: true,
        message: '',
      };
    default:
      return assertNever(check.state);
  }
}
