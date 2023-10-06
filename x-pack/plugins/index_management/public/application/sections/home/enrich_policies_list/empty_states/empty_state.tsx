/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { useAppContext } from '../../../../app_context';

export const EmptyState = () => {
  const { history } = useAppContext();

  return (
    <KibanaPageTemplate.EmptyPrompt
      iconType="managementApp"
      data-test-subj="sectionEmpty"
      title={
        <h2>
          <FormattedMessage
            id="xpack.idxMgmt.enrichPolicies.list.emptyPromptTitle"
            defaultMessage="Add your first enrich policy"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.idxMgmt.enrichPolicies.list.emptyPromptDescription"
            defaultMessage="Use an enrich policy to add data from existing indices into incoming documents during ingest."
          />
        </p>
      }
      actions={
        <EuiButton
          fill
          iconType="plusInCircle"
          data-test-subj="enrichPoliciesEmptyPromptCreateButton"
          {...reactRouterNavigate(history, '/enrich_policies/create')}
        >
          <FormattedMessage
            id="xpack.idxMgmt.enrichPolicies.list.emptyPromptButtonLabel"
            defaultMessage="Add an enrich policy"
          />
        </EuiButton>
      }
    />
  );
};
