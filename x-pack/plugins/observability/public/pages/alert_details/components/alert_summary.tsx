/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPanel,
  EuiTitle,
  EuiLink,
  EuiToolTip,
  EuiIcon,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PageHeaderProps } from '../types';
import { useKibana } from '../../../utils/kibana_react';
import { AlertStatusIndicator } from '../../../components/shared/alert_status_indicator';

export function AlertSummary({ alert }: PageHeaderProps) {
  const { triggersActionsUi } = useKibana().services;

  return (
    <>
      <EuiPanel color="subdued" hasBorder={false} paddingSize={'m'}>
        <EuiTitle size="xs">
          <div>
            <FormattedMessage
              id="xpack.observability.pages.alertDetails.alertSummary"
              defaultMessage="Alert Summary"
            />
            &nbsp;&nbsp;
            <EuiToolTip content="Alert summary info here">
              <EuiIcon type="questionInCircle" color="subdued" />
            </EuiToolTip>
          </div>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiPanel hasBorder={true} hasShadow={false}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.observability.pages.alertDetails.alertSummary.alertName"
                    defaultMessage="Alert"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                #200-230
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.observability.pages.alertDetails.alertSummary.averageValue"
                    defaultMessage="Average Value"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                55 ms (84% above the threshold of 30ms)
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.observability.pages.alertDetails.alertSummary.duration"
                    defaultMessage="Duration"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                5 minutes (threshold breached 10 times)
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.observability.pages.alertDetails.alertSummary.alertStatus"
                    defaultMessage="Status"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <AlertStatusIndicator alertStatus="active" />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.observability.pages.alertDetails.alertSummary.runbook"
                    defaultMessage="Runbook"
                  />
                  &nbsp;&nbsp;
                  <EuiToolTip content="Runbook info here">
                    <EuiIcon type="questionInCircle" color="subdued" />
                  </EuiToolTip>
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiLink>
                https://github.com...
                <EuiButtonEmpty
                  data-test-subj="ruleDetailsEditButton"
                  iconType={'pencil'}
                  onClick={() => {}}
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.observability.pages.alertDetails.alertSummary.started"
                    defaultMessage="Started"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                Jul 22 2021
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.observability.pages.alertDetails.alertSummary.lastStatusUpdate"
                    defaultMessage="Last Status Update"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                2h ago
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.observability.pages.alertDetails.alertSummary.tags"
                    defaultMessage="Tags"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <div>
                <EuiSpacer size="s" />
                {triggersActionsUi.getRuleTagBadge<'tagsOutPopover'>({
                  tagsOutPopover: true,
                  tags: ['tag1', 'tag2', 'tag3'],
                })}
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPanel>
      <EuiSpacer size="xs" />
    </>
  );
}
