/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMlKibana } from '../../contexts/kibana';
import { useStorage } from '../../contexts/ml/use_storage';
import { ML_GETTING_STARTED_CALLOUT_DISMISSED } from '../../../../common/types/storage';

const feedbackLink = 'https://www.elastic.co/community/';

export const GettingStartedCallout: FC = () => {
  const {
    services: { docLinks },
  } = useMlKibana();

  const docsLink = docLinks.links.ml.guide;

  const [isCalloutDismissed, setIsCalloutDismissed] = useStorage(
    ML_GETTING_STARTED_CALLOUT_DISMISSED,
    false
  );

  if (isCalloutDismissed) return null;

  return (
    <>
      <EuiCallOut
        data-test-subj={'mlGettingStartedCallout'}
        title={
          <FormattedMessage
            id="xpack.ml.overview.gettingStartedSectionTitle"
            defaultMessage="Getting started"
          />
        }
        iconType="iInCircle"
      >
        <p>
          <FormattedMessage
            id="xpack.ml.overview.gettingStartedSectionText"
            defaultMessage="Welcome to Machine Learning. Get started by reviewing our {docs} or creating a new job."
            values={{
              docs: (
                <EuiLink href={docsLink} target="blank">
                  <FormattedMessage
                    id="xpack.ml.overview.gettingStartedSectionDocs"
                    defaultMessage="documentation"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.ml.overview.feedbackSectionText"
            defaultMessage="If you have input or suggestions regarding your experience, please submit {feedbackLink}."
            values={{
              feedbackLink: (
                <EuiLink href={feedbackLink} target="blank">
                  <FormattedMessage
                    id="xpack.ml.overview.feedbackSectionLink"
                    defaultMessage="feedback online"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
        <p>
          <EuiButton
            color="primary"
            onClick={setIsCalloutDismissed.bind(null, true)}
            data-test-subj={'mlDismissGettingStartedCallout'}
          >
            <FormattedMessage
              id="xpack.ml.overview.gettingStartedSectionDismiss"
              defaultMessage="Dismiss"
            />
          </EuiButton>
        </p>
      </EuiCallOut>

      <EuiSpacer size="m" />
    </>
  );
};
