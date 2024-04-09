/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { documentationService } from '../../../../services';
import { useAppContext } from '../../../../app_context';

export const EmptyState = () => {
  const {
    history,
    plugins: { share },
  } = useAppContext();

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
        <>
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.enrichPolicies.list.emptyPromptDescription"
              defaultMessage="Use an enrich policy as a lookup reference, to add fields to incoming documents during ingest with {ingestPipelinesLink} or to use the ENRICH command in ES|QL"
              values={{
                ingestPipelinesLink: (
                  <EuiLink
                    href={share.url.locators.get('INGEST_PIPELINES_APP_LOCATOR')?.useUrl({})}
                  >
                    <FormattedMessage
                      id="xpack.idxMgmt.enrichPolicies.list.emptyPromptIngestPipelinesLink"
                      defaultMessage="ingest pipelines"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
          <EuiLink href={documentationService.getCreateEnrichPolicyLink()} target="_blank">
            <FormattedMessage
              id="xpack.idxMgmt.enrichPolicies.list.emptyPromptLearnMoreLink"
              defaultMessage="Learn more about enriching your data"
            />
          </EuiLink>
        </>
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
