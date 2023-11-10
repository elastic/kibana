/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiLink } from '@elastic/eui';
import type { ProductTier } from '../../../common/product';
import { WELCOME_PANEL_PROJECT_CREATED_CHANGE_PLAN_TITLE } from './translations';
import { getProjectFeaturesUrl } from '../../navigation/links/util';
import { useKibana } from '../../common/services';

const ChangePlanLinkComponent = ({ productTier }: { productTier: ProductTier | undefined }) => {
  const { cloud } = useKibana().services;
  return productTier ? (
    <EuiLink
      className="eui-alignMiddle"
      color="primary"
      href={getProjectFeaturesUrl(cloud)}
      target="_blank"
      external={false}
    >
      {WELCOME_PANEL_PROJECT_CREATED_CHANGE_PLAN_TITLE}
      <EuiIcon type="arrowRight" />
    </EuiLink>
  ) : null;
};

export const ChangePlanLink = React.memo(ChangePlanLinkComponent);
