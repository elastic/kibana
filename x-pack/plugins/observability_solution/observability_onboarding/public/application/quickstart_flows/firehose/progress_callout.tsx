/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiText, EuiIconTip, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { css } from '@emotion/react';
import { ProgressIndicator } from '../shared/progress_indicator';

export function ProgressCallout() {
  return (
    <ProgressIndicator
      data-test-subj="observabilityOnboardingFirehoseProgressCallout"
      title={
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiText>
            <p>
              {i18n.translate('xpack.observability_onboarding.firehosePanel.waitingForDataTitle', {
                defaultMessage:
                  'Retrieving data from Amazon Data Firehose... Detecting available services',
              })}
            </p>
          </EuiText>
          <EuiIconTip
            content={
              <EuiText size="s">
                <strong>
                  {i18n.translate(
                    'xpack.observability_onboarding.progressCallout.strong.allServicesWeCanLabel',
                    { defaultMessage: 'All services we can detect' }
                  )}
                </strong>
                <EuiHorizontalRule margin="xs" />
                <ul>
                  <li>
                    {i18n.translate(
                      'xpack.observability_onboarding.progressCallout.li.apiGatewayLabel',
                      { defaultMessage: 'API Gateway' }
                    )}
                  </li>
                  <li>
                    {i18n.translate(
                      'xpack.observability_onboarding.progressCallout.li.awsUsageLabel',
                      { defaultMessage: 'AWS Usage' }
                    )}
                  </li>
                  <li>
                    {i18n.translate(
                      'xpack.observability_onboarding.progressCallout.li.cloudtrailLabel',
                      { defaultMessage: 'CloudTrail' }
                    )}
                  </li>
                  <li>
                    {i18n.translate(
                      'xpack.observability_onboarding.progressCallout.li.dynamodbLabel',
                      { defaultMessage: 'DynamoDB' }
                    )}
                  </li>
                  <li>
                    {i18n.translate('xpack.observability_onboarding.progressCallout.li.ebsLabel', {
                      defaultMessage: 'EBS',
                    })}
                  </li>
                  <li>
                    {i18n.translate('xpack.observability_onboarding.progressCallout.li.ecLabel', {
                      defaultMessage: 'EC2',
                    })}
                  </li>
                  <li>
                    {i18n.translate('xpack.observability_onboarding.progressCallout.li.ecsLabel', {
                      defaultMessage: 'ECS',
                    })}
                  </li>
                  <li>
                    {i18n.translate('xpack.observability_onboarding.progressCallout.li.elbLabel', {
                      defaultMessage: 'ELB',
                    })}
                  </li>
                  <li>
                    {i18n.translate('xpack.observability_onboarding.progressCallout.li.emrLabel', {
                      defaultMessage: 'EMR',
                    })}
                  </li>
                  <li>
                    {i18n.translate(
                      'xpack.observability_onboarding.progressCallout.li.kinesisDataStreamLabel',
                      { defaultMessage: 'Kinesis Data Stream' }
                    )}
                  </li>
                  <li>
                    {i18n.translate(
                      'xpack.observability_onboarding.progressCallout.li.lambdaLabel',
                      { defaultMessage: 'Lambda' }
                    )}
                  </li>
                  <li>
                    {i18n.translate('xpack.observability_onboarding.progressCallout.li.mskLabel', {
                      defaultMessage: 'MSK',
                    })}
                  </li>
                  <li>
                    {i18n.translate(
                      'xpack.observability_onboarding.progressCallout.li.natGatewayLabel',
                      { defaultMessage: 'NAT Gateway' }
                    )}
                  </li>
                  <li>
                    {i18n.translate('xpack.observability_onboarding.progressCallout.li.rdsLabel', {
                      defaultMessage: 'RDS',
                    })}
                  </li>
                  <li>
                    {i18n.translate(
                      'xpack.observability_onboarding.progressCallout.li.routeLabel',
                      { defaultMessage: 'Route53' }
                    )}
                  </li>
                  <li>
                    {i18n.translate('xpack.observability_onboarding.progressCallout.li.sLabel', {
                      defaultMessage: 'S3',
                    })}
                  </li>
                  <li>
                    {i18n.translate('xpack.observability_onboarding.progressCallout.li.snsLabel', {
                      defaultMessage: 'SNS',
                    })}
                  </li>
                  <li>
                    {i18n.translate('xpack.observability_onboarding.progressCallout.li.sqsLabel', {
                      defaultMessage: 'SQS',
                    })}
                  </li>
                  <li>
                    {i18n.translate('xpack.observability_onboarding.progressCallout.li.vpcLabel', {
                      defaultMessage: 'VPC',
                    })}
                  </li>
                  <li>
                    {i18n.translate('xpack.observability_onboarding.progressCallout.li.vpnLabel', {
                      defaultMessage: 'VPN',
                    })}
                  </li>
                  <li>
                    {i18n.translate(
                      'xpack.observability_onboarding.progressCallout.li.otherLabel',
                      {
                        defaultMessage:
                          'Other (Unsupported logs will be stored in a generic Firehose index).',
                      }
                    )}
                  </li>
                </ul>
              </EuiText>
            }
            position="top"
            type="iInCircle"
          />
        </EuiFlexGroup>
      }
      isLoading={true}
      css={css`
        display: inline-block;
      `}
    />
  );
}
