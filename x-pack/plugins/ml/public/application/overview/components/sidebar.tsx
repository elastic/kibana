/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFlexItem, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useMlKibana } from '../../contexts/kibana';

const createJobLink = '#/jobs/new_job/step/index_or_search';
const feedbackLink = 'https://www.elastic.co/community/';

interface Props {
  createAnomalyDetectionJobDisabled: boolean;
}

function getCreateJobLink(createAnomalyDetectionJobDisabled: boolean) {
  return createAnomalyDetectionJobDisabled === true ? (
    <FormattedMessage
      id="xpack.ml.overview.gettingStartedSectionCreateJob"
      defaultMessage="creating a new job"
    />
  ) : (
    <EuiLink href={createJobLink} target="blank">
      <FormattedMessage
        id="xpack.ml.overview.gettingStartedSectionCreateJob"
        defaultMessage="creating a new job"
      />
    </EuiLink>
  );
}

export const OverviewSideBar: FC<Props> = ({ createAnomalyDetectionJobDisabled }) => {
  const {
    services: {
      docLinks,
      http: { basePath },
    },
  } = useMlKibana();

  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  const docsLink = `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/xpack-ml.html`;
  const transformsLink = `${basePath.get()}/app/management/data/transform`;

  return (
    <EuiFlexItem grow={1}>
      <EuiTitle size="m">
        <h1>
          <FormattedMessage
            id="xpack.ml.overview.gettingStartedSectionTitle"
            defaultMessage="Getting started"
          />
        </h1>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText className="mlOverview__sidebar">
        <p>
          <FormattedMessage
            id="xpack.ml.overview.gettingStartedSectionText"
            defaultMessage="Welcome to Machine Learning. Get started by reviewing our {docs} or {createJob}. We recommend using {transforms} to create feature indices for analytics jobs."
            values={{
              docs: (
                <EuiLink href={docsLink} target="blank">
                  <FormattedMessage
                    id="xpack.ml.overview.gettingStartedSectionDocs"
                    defaultMessage="documentation"
                  />
                </EuiLink>
              ),
              createJob: getCreateJobLink(createAnomalyDetectionJobDisabled),
              transforms: (
                <EuiLink href={transformsLink} target="blank">
                  <FormattedMessage
                    id="xpack.ml.overview.gettingStartedSectionTransforms"
                    defaultMessage="Elasticsearch's transforms"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
        <h2>
          <FormattedMessage id="xpack.ml.overview.feedbackSectionTitle" defaultMessage="Feedback" />
        </h2>
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
      </EuiText>
    </EuiFlexItem>
  );
};
