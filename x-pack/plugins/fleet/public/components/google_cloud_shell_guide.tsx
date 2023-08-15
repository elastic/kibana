/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

/* Need to change to the real URL */
const GOOGLE_CLOUD_SHELL_EXTERNAL_DOC_URL = 'https://cloud.google.com/shell/docs';

const Link = ({ children, url }: { children: React.ReactNode; url: string }) => (
  <EuiLink
    href={url}
    target="_blank"
    rel="noopener nofollow noreferrer"
    data-test-subj="externalLink"
  >
    {children}
  </EuiLink>
);

export const GoogleCloudShellGuide = (props: { commandText: string }) => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.fleet.googleCloudShell.guide.description"
            defaultMessage="The Google Cloud Shell Command below will create all the necessary resources to evaluate the security posture of your GCP projects. Learn more about {learnMore}."
            values={{
              learnMore: (
                <Link url={GOOGLE_CLOUD_SHELL_EXTERNAL_DOC_URL}>
                  <FormattedMessage
                    id="xpack.fleet.googleCloudShell.guide.learnMoreLinkText"
                    defaultMessage="Google Cloud Shell"
                  />
                </Link>
              ),
            }}
          />
        </p>
        <EuiText size="s" color="subdued">
          <ol>
            <li>
              <FormattedMessage
                id="xpack.fleet.googleCloudShell.guide.steps.login"
                defaultMessage="Log into your Google Cloud Console"
              />
            </li>
            <li>
              <>
                <FormattedMessage
                  id="xpack.fleet.googleCloudShell.guide.steps.copy"
                  defaultMessage="Copy the command below"
                />
                <EuiSpacer size="m" />
                <EuiCodeBlock language="bash" isCopyable>
                  {props.commandText}
                </EuiCodeBlock>
              </>
            </li>
            <li>
              <FormattedMessage
                id="xpack.fleet.googleCloudShell.guide.steps.launch"
                defaultMessage="Click the Launch Google Cloud Shell button below and then execute the command you copied earlier in google cloud shell."
              />
            </li>
          </ol>
        </EuiText>
      </EuiText>
    </>
  );
};
