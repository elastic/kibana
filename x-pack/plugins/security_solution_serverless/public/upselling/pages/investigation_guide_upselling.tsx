/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppFeatureKey } from '@kbn/security-solution-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { useProductTypeByPLI } from '../hooks/use_product_type_by_pli';

export const InvestigationGuideUpselling: React.FC<{ requiredPLI: AppFeatureKey }> = React.memo(
  function InvestigationGuideUpselling({ requiredPLI }) {
    const productTypeRequired = useProductTypeByPLI(requiredPLI);

    return (
      <FormattedMessage
        id="xpack.securitySolutionServerless.markdown.insight.upsell"
        defaultMessage="Upgrade to {productTypeRequired} make use of insights in investigation guides"
        values={{
          productTypeRequired,
        }}
      />
    );
  }
);

// eslint-disable-next-line import/no-default-export
export { InvestigationGuideUpselling as default };
