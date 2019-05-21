/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { pure } from 'recompose';
import { documentationLinks } from 'ui/documentation_links';

export const Summary = pure(() => (
  <EuiFlexItem>
    <EuiText>
      <h2>
        <FormattedMessage id="xpack.siem.overview.startedTitle" defaultMessage="Getting Started" />
      </h2>

      <p>
        <FormattedMessage
          id="xpack.siem.overview.startedText"
          defaultMessage="Welcome to Security Information &amp; Event Management (SIEM). Get started by reviewing our {docs} or {data}. For information about upcoming features and tutorials, be sure to check out our {blog} and {videos}."
          values={{
            docs: (
              <EuiLink href={documentationLinks.kibana} target="blank">
                documentation
              </EuiLink>
            ),
            data: <EuiLink href="kibana#home/tutorial_directory/security">ingesting data</EuiLink>,
            blog: (
              <EuiLink href="#" target="blank">
                blog posts
              </EuiLink>
            ),
            videos: (
              <EuiLink href="#" target="blank">
                videos
              </EuiLink>
            ),
          }}
        />
      </p>

      <h2>
        <FormattedMessage id="xpack.siem.overview.feedbackTitle" defaultMessage="Feedback" />
      </h2>

      <p>
        <FormattedMessage
          id="xpack.siem.overview.feedbackText"
          defaultMessage="If you have input or suggestions regarding your experience with SIEM, please feel free to {feedback}."
          values={{
            feedback: (
              <EuiLink href="https://discuss.elastic.co/" target="blank">
                submit feedback online
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  </EuiFlexItem>
));
