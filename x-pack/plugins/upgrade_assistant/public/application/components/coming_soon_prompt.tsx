/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiPageContent, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useAppContext } from '../app_context';

export const ComingSoonPrompt: React.FunctionComponent = () => {
  const { kibanaVersionInfo, docLinks } = useAppContext();
  const { nextMajor, currentMajor } = kibanaVersionInfo;
  const { ELASTIC_WEBSITE_URL } = docLinks;

  return (
    <EuiPageContent>
      <EuiEmptyPrompt
        iconType="wrench"
        data-test-subj="comingSoonPrompt"
        title={
          <h2>
            <FormattedMessage
              id="xpack.upgradeAssistant.emptyPromptTitle"
              defaultMessage="Coming soon: {uaVersion} Upgrade Assistant"
              values={{ uaVersion: `${nextMajor}.0` }}
            />
          </h2>
        }
        body={
          <>
            <p>
              <FormattedMessage
                id="xpack.upgradeAssistant.emptyPromptDescription"
                defaultMessage="The Upgrade Assistant helps prepare for your upgrade to the next major Elasticsearch version.
                It identifies deprecated settings in your cluster and guides you through the process of resolving issues, such as reindexing.
                Check back here when Elasticsearch {nextMajorVersion} is released."
                values={{ nextMajorVersion: `${nextMajor}.0` }}
              />
            </p>
            {currentMajor === 7 && (
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.emptyPromptDescription"
                  defaultMessage="To learn more about the upcoming changes, see {learnMoreLink}."
                  values={{
                    learnMoreLink: (
                      <EuiLink
                        external
                        target="_blank"
                        href={`${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/master/migrating-8.0.html`}
                      >
                        Migrating to 8.0
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            )}
          </>
        }
      />
    </EuiPageContent>
  );
};
