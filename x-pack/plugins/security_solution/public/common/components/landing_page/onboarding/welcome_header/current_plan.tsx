/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiSpacer } from '@elastic/eui';
import classnames from 'classnames';
import { isEmpty } from 'lodash/fp';
import React from 'react';
import { useLicense } from '../../../../hooks/use_license';
import { useAppUrl } from '../../../../lib/kibana';
import { useCurrentPlanStyles } from '../styles/current_plan.styles';
import { CURRENT_PLAN_LABEL, CURRENT_TIER_LABEL } from '../translations';
import { CurrentPlanBadge } from './current_plan_badge';

const CurrentPlanComponent = ({
  productTier,
  projectFeaturesUrl,
}: {
  productTier: string | undefined;
  projectFeaturesUrl: string | undefined;
}) => {
  const licenseService = useLicense();
  const licenseType = licenseService.getLicenseType();
  const isTrial = licenseType === 'trial';
  const isEnterprise = licenseService.isEnterprise() && !isTrial;

  const { getAppUrl } = useAppUrl();
  const licenseManagementUrl = getAppUrl({
    appId: 'management',
    path: 'stack/license_management/home',
  });

  const currentPlan = productTier ? productTier : !isEmpty(licenseType) ? licenseType : undefined;
  const label = productTier ? CURRENT_TIER_LABEL : CURRENT_PLAN_LABEL;
  const link = productTier ? projectFeaturesUrl : licenseManagementUrl;

  const { currentPlanWrapperStyles, currentPlanTextStyles, projectFeaturesUrlStyles } =
    useCurrentPlanStyles();
  const currentPlanWrapperClassNames = classnames(
    'eui-displayInlineBlock',
    currentPlanWrapperStyles
  );
  const projectFeaturesUrlClassNames = classnames('eui-alignMiddle', projectFeaturesUrlStyles);

  if (isEnterprise && productTier == null) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="l" />
      <div>
        <div className={currentPlanWrapperClassNames}>
          <span data-test-subj="currentPlanLabel" className={currentPlanTextStyles}>
            {label}
          </span>
          <CurrentPlanBadge currentPlan={currentPlan} />

          {link && (
            <EuiButtonIcon
              data-test-subj="currentPlanLink"
              className={projectFeaturesUrlClassNames}
              color="primary"
              href={link}
              target="_blank"
              aria-label={label}
              iconType="gear"
              size="xs"
            />
          )}
        </div>
      </div>
    </>
  );
};

export const CurrentPlan = React.memo(CurrentPlanComponent);
