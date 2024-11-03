/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiLink } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../shared/doc_links';

export const AdvancedConfigOverrideCallout: React.FC = () => (
  <EuiCallOut
    title={i18n.translate(
      'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.advancedRulesCallout',
      { defaultMessage: 'Configuration warning' }
    )}
    iconType="iInCircle"
    color="warning"
  >
    <FormattedMessage
      id="xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.advancedRulesCallout.description"
      defaultMessage="{advancedSyncRulesDocs} can override some configuration fields."
      values={{
        advancedSyncRulesDocs: (
          <EuiLink
            data-test-subj="entSearchContent-connector-configuration-advancedSyncRulesDocsLink"
            data-telemetry-id="entSearchContent-connector-configuration-advancedSyncRulesDocsLink"
            href={docLinks.syncRules}
            target="_blank"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.connector_detail.configurationConnector.connectorPackage.advancedSyncRulesDocs',
              { defaultMessage: 'Advanced Sync Rules' }
            )}
          </EuiLink>
        ),
      }}
    />
  </EuiCallOut>
);
