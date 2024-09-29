/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface DeprecationCalloutProps {
  onDismissAction: () => void;
}

export const EnterpriseSearchDeprecationCallout: React.FC<DeprecationCalloutProps> = ({
  onDismissAction,
}) => {
  return (
    <EuiCallOut
      onDismiss={onDismissAction}
      iconType={'warning'}
      color={'warning'}
      title={i18n.translate(
        'xpack.enterpriseSearch.enterpriseSearchDeprecationCallout.euiCallOut.title',
        { defaultMessage: 'Important Note' }
      )}
      data-test-subj="EnterpriseSearchDeprecationCallout"
    >
      <p>
        {i18n.translate('xpack.enterpriseSearch.deprecationCallout.first_message', {
          defaultMessage:
            'The standalone App Search and Workplace Search products remain available in maintenance mode, and are not recommended for new search experiences. Instead, we recommend using our Elasticsearch-native tools which we are actively developing and improving, for your search use cases. These tools offer the flexibility and composability of working directly with Elasticsearch indices.',
        })}
      </p>
      <p>
        {i18n.translate('xpack.enterpriseSearch.deprecationCallout.first_message', {
          defaultMessage:
            'See this blog[link here] post for more information about upgrading your internal knowledge search or this blog post[link here] about upgrading your catalog search. (opens in a new tab or window).',
        })}
      </p>
      <EuiButton href="#" color="warning" fill>
        CTA Link Button
      </EuiButton>
    </EuiCallOut>
  );
};
