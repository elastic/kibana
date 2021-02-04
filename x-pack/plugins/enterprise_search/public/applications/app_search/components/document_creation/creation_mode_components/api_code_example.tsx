/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import React from 'react';
import { useValues, useActions } from 'kea';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiText,
  EuiLink,
  EuiSpacer,
  EuiPanel,
  EuiBadge,
  EuiCode,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { getEnterpriseSearchUrl } from '../../../../shared/enterprise_search_url';
import { EngineLogic } from '../../engine';
import { EngineDetails } from '../../engine/types';

import { DOCS_PREFIX } from '../../../routes';
import {
  DOCUMENTS_API_JSON_EXAMPLE,
  FLYOUT_ARIA_LABEL_ID,
  FLYOUT_CANCEL_BUTTON,
} from '../constants';
import { DocumentCreationLogic } from '../';

export const ApiCodeExample: React.FC = () => (
  <>
    <FlyoutHeader />
    <FlyoutBody />
    <FlyoutFooter />
  </>
);

export const FlyoutHeader: React.FC = () => {
  return (
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2 id={FLYOUT_ARIA_LABEL_ID}>
          {i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.api.title', {
            defaultMessage: 'Indexing by API',
          })}
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );
};

export const FlyoutBody: React.FC = () => {
  const { engineName, engine } = useValues(EngineLogic);
  const { apiKey } = engine as EngineDetails;

  const documentsApiUrl = getEnterpriseSearchUrl(`/api/as/v1/engines/${engineName}/documents`);

  return (
    <EuiFlyoutBody>
      <EuiText color="subdued">
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.appSearch.documentCreation.api.description"
            defaultMessage="The {documentsApiLink} can be used to add new documents to your engine, update documents, retrieve documents by id, and delete documents. There are a variety of {clientLibrariesLink} to help you get started."
            values={{
              documentsApiLink: (
                <EuiLink target="_blank" href={`${DOCS_PREFIX}/indexing-documents-guide.html`}>
                  documents API
                </EuiLink>
              ),
              clientLibrariesLink: (
                <EuiLink target="_blank" href={`${DOCS_PREFIX}/api-clients.html`}>
                  client libraries
                </EuiLink>
              ),
            }}
          />
        </p>
        <p>
          {i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.api.example', {
            defaultMessage:
              'To see the API in action, you can experiment with the example request below using a command line or a client library.',
          })}
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiPanel hasShadow={false} paddingSize="s" className="eui-textBreakAll">
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary">POST</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCode transparentBackground>{documentsApiUrl}</EuiCode>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiCodeBlock language="bash" fontSize="m" isCopyable>
        {dedent(`
        curl -X POST '${documentsApiUrl}'
          -H 'Content-Type: application/json'
          -H 'Authorization: Bearer ${apiKey}'
          -d '${DOCUMENTS_API_JSON_EXAMPLE}'
        # Returns
        # [
        #   {
        #     "id": "park_rocky-mountain",
        #     "errors": []
        #   },
        #   {
        #     "id": "park_saguaro",
        #     "errors": []
        #   }
        # ]
      `)}
      </EuiCodeBlock>
    </EuiFlyoutBody>
  );
};

export const FlyoutFooter: React.FC = () => {
  const { closeDocumentCreation } = useActions(DocumentCreationLogic);

  return (
    <EuiFlyoutFooter>
      <EuiButtonEmpty onClick={closeDocumentCreation}>{FLYOUT_CANCEL_BUTTON}</EuiButtonEmpty>
    </EuiFlyoutFooter>
  );
};
