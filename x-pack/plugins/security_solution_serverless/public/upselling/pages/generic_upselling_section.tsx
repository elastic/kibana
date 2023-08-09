/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLink } from '@elastic/eui';
import type { AppFeatureKey } from '@kbn/security-solution-plugin/common';
import { getProductTypeByPLI } from '../hooks/use_product_type_by_pli';

export const GenericUpsellingSection: React.FC<{ requiredPLI: AppFeatureKey }> = React.memo(
  function GenericUpsellingSection({ requiredPLI }) {
    const productTypeRequired = getProductTypeByPLI(requiredPLI);

    return (
      <EuiEmptyPrompt
        iconType="logoSecurity"
        title={<>{'This is a testing component for a Serverless upselling prompt.'}</>}
        body={
          <>
            {'Get'} <EuiLink href="#">{productTypeRequired}</EuiLink> {'to enable this feature'}
            <br />
            <br />
            <iframe
              title="money"
              src="https://giphy.com/embed/px8O7NANzzaqk"
              width="480"
              height="283"
              frameBorder="0"
              className="giphy-embed"
              allowFullScreen
            />
          </>
        }
      />
    );
  }
);

// eslint-disable-next-line import/no-default-export
export { GenericUpsellingSection as default };
