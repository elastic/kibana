/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiCode, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { useKibana, useBasePath } from '../../../common/lib/kibana';
import * as i18n from './translations';

export const IndexPatternsMissingPromptComponent = () => {
  const { docLinks } = useKibana().services;
  const kibanaBasePath = `${useBasePath()}/app/kibana`;

  return (
    <EuiEmptyPrompt
      iconType="gisApp"
      title={<h2>{i18n.ERROR_TITLE}</h2>}
      titleSize="xs"
      body={
        <>
          <p>
            <FormattedMessage
              defaultMessage="To display map data, you must define SIEM indices ({defaultIndex}) and Kibana index patterns with matching glob patterns. When using {beats}, you can run the {setup} command on your hosts to automatically create the index patterns. For example: {example}."
              id="xpack.securitySolution.components.embeddables.indexPatternsMissingPrompt.errorDescription1"
              values={{
                defaultIndex: (
                  <a
                    href={`${kibanaBasePath}#/management/kibana/settings`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {'securitySolution:defaultIndex'}
                  </a>
                ),
                beats: (
                  <a
                    href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/beats/libbeat/${docLinks.DOC_LINK_VERSION}/getting-started.html`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {'beats'}
                  </a>
                ),
                setup: <EuiCode>{'setup'}</EuiCode>,
                example: <EuiCode>{'./packetbeat setup'}</EuiCode>,
              }}
            />
          </p>

          <p>
            <FormattedMessage
              defaultMessage="You can also configure index patterns manually in Kibana."
              id="xpack.securitySolution.components.embeddables.indexPatternsMissingPrompt.errorDescription2"
            />
          </p>
        </>
      }
      actions={
        <EuiButton
          href={`${kibanaBasePath}#/management/kibana/indexPatterns`}
          color="primary"
          target="_blank"
          fill
        >
          {i18n.ERROR_BUTTON}
        </EuiButton>
      }
    />
  );
};

IndexPatternsMissingPromptComponent.displayName = 'IndexPatternsMissingPromptComponent';

export const IndexPatternsMissingPrompt = React.memo(IndexPatternsMissingPromptComponent);

IndexPatternsMissingPrompt.displayName = 'IndexPatternsMissingPrompt';
