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
    featureUsage.register('security_sub_feature_privileges');
    featureUsage.register('security_pre_access_agreement');
  }

  public start({ featureUsage }: StartDeps): SecurityFeatureUsageServiceStart {
    return {
      recordPreAccessAgreementUsage() {
        featureUsage.notifyUsage('security_pre_access_agreement');
      },
      recordSubFeaturePrivilegeUsage(kibanaPrivileges: Array<Optional<RoleKibanaPrivilege>> = []) {
        featureUsage.notifyUsage('security_sub_feature_privileges');
      },
    };
  }
}
