/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { ApplicationStart } from 'kibana/public';

import { EuiEmptyPrompt, EuiButton, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { DocumentationLinksService } from '../../documentation_links';

interface Props {
  isAdmin: boolean;
  docLinks: DocumentationLinksService;
  navigateToApp: ApplicationStart['navigateToApp'];
}

export const EmptyPrompt: React.FunctionComponent<Props> = ({
  isAdmin,
  docLinks,
  navigateToApp,
}) => (
  <EuiEmptyPrompt
    iconType="managementApp"
    title={
      <h1 data-test-subj="noApiKeysHeader">
        {isAdmin ? (
          <FormattedMessage
            id="xpack.security.management.apiKeys.table.emptyPromptAdminTitle"
            defaultMessage="No API keys"
          />
        ) : (
          <FormattedMessage
            id="xpack.security.management.apiKeys.table.emptyPromptNonAdminTitle"
            defaultMessage="You don't have any API keys"
          />
        )}
      </h1>
    }
    body={
      <Fragment>
        <p>
          <FormattedMessage
            id="xpack.security.management.apiKeys.table.emptyPromptDescription"
            defaultMessage="You can create an {link} from Console."
            values={{
              link: (
                <EuiLink href={`${docLinks.getCreateApiKeyDocUrl()}`} target="_blank">
                  <FormattedMessage
                    id="xpack.security.management.apiKeys.table.emptyPromptDocsLinkMessage"
                    defaultMessage="API key"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </Fragment>
    }
    actions={
      <EuiButton
        type="primary"
        onClick={() => navigateToApp('dev_tools')}
        data-test-subj="goToConsoleButton"
      >
        <FormattedMessage
          id="xpack.security.management.apiKeys.table.emptyPromptConsoleButtonMessage"
          defaultMessage="Go to Console"
        />
      </EuiButton>
    }
    data-test-subj="emptyPrompt"
  />
);
