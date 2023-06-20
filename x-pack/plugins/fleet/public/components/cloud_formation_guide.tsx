/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Link } from 'react-router-dom';

export const CloudFormationGuide = () => {
  return (
    <EuiText>
      <p>
        <FormattedMessage
          id="xpack.fleet.cloudFormation.guide.description"
          defaultMessage="CloudFormation will create all the necessary resources to evaluate the security posture of your AWS environment. {learnMore}."
          values={{
            learnMore: (
              <Link to={'https://ela.st/cspm-get-started'}>
                <FormattedMessage
                  id="xpack.fleet.cloudFormation.guide.learnMoreLinkText"
                  defaultMessage="Learn more"
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
              id="xpack.fleet.cloudFormation.guide.steps.login"
              defaultMessage="Ensure you are logged in as an admin in the AWS Account you want to onboard"
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudFormation.guide.steps.launch"
              defaultMessage="Click the Launch CloudFormation button bellow."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudFormation.guide.steps.region"
              defaultMessage="(Optional) Change the Amazon region in the upper right corner to the region you want to deploy your stack to"
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudFormation.guide.steps.accept"
              defaultMessage="Tick the checkbox under capabilities in the opened CloudFormation stack review form: {acknowledge}"
              values={{
                acknowledge: (
                  <strong>
                    <FormattedMessage
                      id="xpack.fleet.cloudFormation.guide.steps.accept.acknowledge"
                      defaultMessage="I acknowledge that AWS CloudFormation might create IAM resources."
                    />
                  </strong>
                ),
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.cloudFormation.guide.steps.create"
              defaultMessage="Click Create stack."
            />
          </li>
        </ol>
      </EuiText>
    </EuiText>
  );
};
