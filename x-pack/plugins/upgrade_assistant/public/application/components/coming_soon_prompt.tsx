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

  console.log(nextMajor);

  return (
    <EuiPageContent>
      <EuiEmptyPrompt
        iconType="wrench"
        data-test-subj="comingSoonPrompt"
        title={
          <h2>
            <FormattedMessage
              id="xpack.upgradeAssistant.emptyPrompt.title"
              defaultMessage="{uaVersion} Upgrade Assistant coming soon"
              values={{ uaVersion: `${nextMajor}.0` }}
            />
          </h2>
        }
        body={
          <>
            <p>
              <FormattedMessage
                id="xpack.upgradeAssistant.emptyPrompt.upgradeAssistantDescription"
                defaultMessage="The Upgrade Assistant identifies deprecated settings in your cluster and
                guides you through the process of resolving issues. Check back here when Elasticsearch {nextMajor} is released."
                values={{ nextMajor: `${nextMajor}.0` }}
              />
              {currentMajor === 7 && (
                <>
                  {' '}
                  <EuiLink
                    external
                    target="_blank"
                    href={`${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/master/migrating-8.0.html`}
                  >
                    <FormattedMessage
                      id="xpack.upgradeAssistant.emptyPrompt.learnMoreDescription"
                      defaultMessage="Learn more about migrating to {nextMajor}."
                      values={{
                        nextMajor: `${nextMajor}.0`,
                      }}
                    />
                  </EuiLink>
                </>
              )}
            </p>
          </>
        }
      />
    </EuiPageContent>
  );
};
