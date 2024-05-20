/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiCard, EuiIcon, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ProductFeatureKey } from '@kbn/security-solution-features/src/product_features_keys';
import { getProductTypeByPLI } from '../../hooks/use_product_type_by_pli';

/**
 * Component displayed when a given product tier is not allowed to use endpoint policy protections.
 */
export const CloudSecurityPosturePLIBlock = memo(() => {
  const requiredPLI =
    getProductTypeByPLI(ProductFeatureKey.cloudSecurityPosture) || 'Cloud Essentials';

  return (
    <>
      <EuiSpacer size="s" />
      <EuiCard
        data-test-subj="cloud-security-posture-protectionUpdatesLockedCard"
        isDisabled={true}
        description={false}
        icon={<EuiIcon size="xl" type="lock" />}
        betaBadgeProps={{
          'data-test-subj': 'cloud-security-posture-protectionUpdatesLockedCard-badge',
          label: i18n.translate(
            'xpack.securitySolutionServerless.cloudSecurityPosturePliBlock.badgeText',
            {
              defaultMessage: 'Cloud Protection Essentials',
            }
          ),
        }}
        title={
          <h3 data-test-subj="cloud-security-posture-protectionUpdatesLockedCard-title">
            <strong>
              {i18n.translate(
                'xpack.securitySolutionServerless.cloudSecurityPosturePliBlock.cardTitle',
                {
                  defaultMessage: 'Protection updates',
                }
              )}
            </strong>
          </h3>
        }
      >
        <div>
          {i18n.translate(
            'xpack.securitySolutionServerless.cloudSecurityPosturePliBlock.cardMessage',
            {
              defaultMessage:
                'To turn on CSPM, KSPM or CNVM, view your Cloud Posture Dashboards and generate findings of misconfiguration or vulnerabilities in your cloud environment, you must add {requiredPLI} under Manage --> Project features.',
              values: {
                requiredPLI,
              },
            }
          )}
        </div>
      </EuiCard>
    </>
  );
});
CloudSecurityPosturePLIBlock.displayName = 'CloudSecurityPosturePLIBlock';
