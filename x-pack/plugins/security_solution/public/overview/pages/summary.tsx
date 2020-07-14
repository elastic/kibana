/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { ADD_DATA_PATH } from '../../../common/constants';

import { useKibana } from '../../common/lib/kibana';

export const Summary = React.memo(() => {
  const docLinks = useKibana().services.docLinks;

  return (
    <EuiFlexItem>
      <EuiText>
        <h2>
          <FormattedMessage
            id="xpack.securitySolution.overview.startedTitle"
            defaultMessage="Getting started"
          />
        </h2>

        <p>
          <FormattedMessage
            id="xpack.securitySolution.overview.startedText"
            defaultMessage="Welcome to Security Information &amp; Event Management (SIEM). Get started by reviewing our {docs} or {data}. For information about upcoming features and tutorials, be sure to check out our {siemSolution} page."
            values={{
              docs: (
                <EuiLink href={docLinks.links.siem.guide} target="blank">
                  <FormattedMessage
                    id="xpack.securitySolution.overview.startedText.docsLinkText"
                    defaultMessage="documentation"
                  />
                </EuiLink>
              ),
              data: (
                <EuiLink href={ADD_DATA_PATH}>
                  <FormattedMessage
                    id="xpack.securitySolution.overview.startedText.dataLinkText"
                    defaultMessage="ingesting data"
                  />
                </EuiLink>
              ),
              siemSolution: (
                <EuiLink href="https://www.elastic.co/solutions/siem" target="blank">
                  <FormattedMessage
                    id="xpack.securitySolution.overview.startedText.siemSolutionLinkText"
                    defaultMessage="SIEM solution"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>

        <h2>
          <FormattedMessage
            id="xpack.securitySolution.overview.feedbackTitle"
            defaultMessage="Feedback"
          />
        </h2>

        <p>
          <FormattedMessage
            id="xpack.securitySolution.overview.feedbackText"
            defaultMessage="If you have input or suggestions regarding your experience with Elastic SIEM, please feel free to {feedback}."
            values={{
              feedback: (
                <EuiLink href="https://discuss.elastic.co/c/siem" target="blank">
                  <FormattedMessage
                    id="xpack.securitySolution.overview.feedbackText.feedbackLinkText"
                    defaultMessage="submit feedback online"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    </EuiFlexItem>
  );
});

Summary.displayName = 'Summary';
