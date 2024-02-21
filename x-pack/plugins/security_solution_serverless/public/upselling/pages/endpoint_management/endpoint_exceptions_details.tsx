/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo } from 'react';
import type { ProductFeatureKeyType } from '@kbn/security-solution-features/keys';
import { getProductTypeByPLI } from '../../hooks/use_product_type_by_pli';

const EndpointExceptionsDetailsUpselling: React.FC<{ requiredPLI: ProductFeatureKeyType }> = memo(
  ({ requiredPLI }) => {
    const productTypeRequired = getProductTypeByPLI(requiredPLI);

    return (
      <EuiEmptyPrompt
        icon={<EuiIcon type="logoSecurity" size="xl" />}
        color="subdued"
        title={
          <h2>
            <FormattedMessage
              id="xpack.securitySolutionServerless.endpoint.exceptions.details.paywall.title"
              defaultMessage="Do more with Security!"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.securitySolutionServerless.endpoint.exceptions.details.paywall.body"
              defaultMessage="Upgrade your license to {productTypeRequired} to use Endpoint Security Exception List."
              values={{ productTypeRequired }}
            />
          </p>
        }
      />
    );
  }
);

EndpointExceptionsDetailsUpselling.displayName = 'EndpointExceptionsDetailsUpselling';

// eslint-disable-next-line import/no-default-export
export { EndpointExceptionsDetailsUpselling as default };
