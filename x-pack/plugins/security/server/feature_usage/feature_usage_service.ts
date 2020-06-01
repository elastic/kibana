/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Optional } from '@kbn/utility-types';
import { FeatureUsageServiceSetup, FeatureUsageServiceStart } from '../../../licensing/server';
import { RoleKibanaPrivilege } from '../../common/model';

interface SetupDeps {
  featureUsage: FeatureUsageServiceSetup;
}

interface StartDeps {
  featureUsage: FeatureUsageServiceStart;
}

export interface SecurityFeatureUsageServiceStart {
  recordPreAccessAgreementUsage: () => void;
  recordSubFeaturePrivilegeUsage: () => void;
}

export class SecurityFeatureUsageService {
  public setup({ featureUsage }: SetupDeps) {
    featureUsage.register('Subfeature privileges', 'gold');
    featureUsage.register('Pre-access agreement', 'gold');
  }

  public start({ featureUsage }: StartDeps): SecurityFeatureUsageServiceStart {
    return {
      recordPreAccessAgreementUsage() {
        featureUsage.notifyUsage('Pre-access agreement');
      },
      recordSubFeaturePrivilegeUsage(kibanaPrivileges: Array<Optional<RoleKibanaPrivilege>> = []) {
        featureUsage.notifyUsage('Subfeature privileges');
      },
    };
  }
}
