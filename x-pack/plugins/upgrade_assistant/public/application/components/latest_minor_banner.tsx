/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { useAppContext } from '../app_context';

export const LatestMinorBanner: React.FunctionComponent = () => {
  const { docLinks, kibanaVersionInfo } = useAppContext();

  const { ELASTIC_WEBSITE_URL } = docLinks;
  const esDocBasePath = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference`;

  const { currentMajor, nextMajor } = kibanaVersionInfo;

  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.upgradeAssistant.tabs.incompleteCallout.calloutTitle"
          defaultMessage="Issues list might be incomplete"
        />
      }
      color="warning"
      iconType="help"
    >
      <p>
        <FormattedMessage
          id="xpack.upgradeAssistant.tabs.incompleteCallout.calloutBody.calloutDetail"
          defaultMessage="The complete list of {breakingChangesDocButton} in Elasticsearch {nextEsVersion}
            will be available in the final {currentEsVersion} minor release. When the list
            is complete, this warning will go away."
          values={{
            breakingChangesDocButton: (
              <EuiLink
                href={`${esDocBasePath}/master/breaking-changes.html`} // Pointing to master here, as we want to direct users to breaking changes for the next major ES version
                target="_blank"
                external
              >
                <FormattedMessage
                  id="xpack.upgradeAssistant.tabs.incompleteCallout.calloutBody.breackingChangesDocButtonLabel"
                  defaultMessage="deprecations and breaking changes"
                />
              </EuiLink>
            ),
            nextEsVersion: `${nextMajor}.x`,
            currentEsVersion: `${currentMajor}.x`,
          }}
        />
      </p>
    </EuiCallOut>
  );
};
