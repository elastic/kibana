/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiButton, EuiLink, EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface DeprecationCalloutProps {
  onDismissAction: () => void;
  learnMoreLinkUrl: string;
  restrictWidth?: boolean;
}

export const EnterpriseSearchDeprecationCallout: React.FC<DeprecationCalloutProps> = ({
  onDismissAction,
  learnMoreLinkUrl,
  restrictWidth = false,
}) => {
  const maxWidth = restrictWidth ? '75%' : '100%';
  const cssStyles = {
    maxWidth,
    marginLeft: 'auto',
    marginRight: 'auto',
    marginTop: '16px',
    marginBottom: '16px',
  };
  return (
    <div style={cssStyles}>
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
        <FormattedMessage
          id="xpack.enterpriseSearch.deprecationCallout.message"
          defaultMessage="The standalone App Search and Workplace Search products remain available in maintenance mode. We recommend using our Elastic Stack tools to build new semantic and AI powered search experiences."
        />
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="row" alignItems="center" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiButton
              href={learnMoreLinkUrl}
              color="warning"
              iconType="popout"
              iconSide="right"
              target="_blank"
              data-test-subj="ent-search-deprecation-callout-cta"
              fill
            >
              Learn more
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              target="_blank"
              onClick={onDismissAction}
              color="warning"
              data-test-subj="dismiss-ent-search-deprecation-callout"
            >
              {i18n.translate('xpack.enterpriseSearch.deprecationCallout.dismissLink', {
                defaultMessage: 'Dismiss',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    </div>
  );
};
