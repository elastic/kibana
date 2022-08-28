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
    EuiButtonEmpty
} from '@elastic/eui';
import { AlertSummaryItemProps, PageHeaderProps } from '../types';
import { useKibana } from '../../../utils/kibana_react';
import { FormattedMessage } from 'react-intl';
import { AlertStatusIndicator } from '@kbn/observability-plugin/public/components/shared/alert_status_indicator';

export function AlertSummary({ alert }: PageHeaderProps) {
    const { triggersActionsUi } = useKibana().services;

    return (
        <>
            <EuiPanel color="subdued" hasBorder={false} paddingSize={"m"}>
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
                        <AlertSummaryItem formattedMessageId="alertName" defaultMessage="Alert">
                            <EuiText size="s" color="subdued">
                                #200-230
                            </EuiText>
                        </AlertSummaryItem>
                        <AlertSummaryItem formattedMessageId="averageValue" defaultMessage="Average Value">
                            <EuiText size="s" color="subdued">
                                55 ms (84% above the threshold of 30ms)
                            </EuiText>
                        </AlertSummaryItem>
                        <AlertSummaryItem formattedMessageId="duration" defaultMessage="Duration">
                            <EuiText size="s" color="subdued">
                                5 minutes (threshold breached 10 times)
                            </EuiText>
                        </AlertSummaryItem>
                        <AlertSummaryItem formattedMessageId="alertStatus" defaultMessage="Status">
                            <AlertStatusIndicator alertStatus="active"></AlertStatusIndicator>
                        </AlertSummaryItem>
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
                                    onClick={() => { }}
                                />
                            </EuiLink>
                        </EuiFlexItem>
                        <AlertSummaryItem formattedMessageId="started" defaultMessage="Started">
                            <EuiText size="s" color="subdued">
                                Jul 22 2021
                            </EuiText>
                        </AlertSummaryItem>
                        <AlertSummaryItem formattedMessageId="lastStatusUpdate" defaultMessage="Last Status Update">
                            <EuiText size="s" color="subdued">
                                2h ago
                            </EuiText>
                        </AlertSummaryItem>
                        <AlertSummaryItem formattedMessageId="tags" defaultMessage="Tags">
                            <div>
                                <EuiSpacer size="s" />
                                {
                                    triggersActionsUi.getRuleTagBadge<'tagsOutPopover'>({
                                        tagsOutPopover: true,
                                        tags: ["tag1", "tag2", "tag3"],
                                    })
                                }
                            </div>
                        </AlertSummaryItem>
                        {/* <AlertSummaryItem formattedMessageId="tags" defaultMessage="Tags">
                            <div>
                                <EuiSpacer size="s" />
                                {
                                    alert.rule.tags.length > 0 &&
                                    triggersActionsUi.getRuleTagBadge<'tagsOutPopover'>({
                                        tagsOutPopover: true,
                                        tags: alert.rule.tags,
                                    })
                                }
                            </div>
                        </AlertSummaryItem> */}
                    </EuiFlexGroup>
                </EuiPanel>
            </EuiPanel>
            < EuiSpacer size="xs" />
        </>
    );
}

function AlertSummaryItem({ formattedMessageId, defaultMessage, children }: AlertSummaryItemProps) {
    return (
        <EuiFlexItem>
            <EuiTitle size="xxs">
                <h5>
                    <FormattedMessage
                        id={`xpack.observability.pages.alertDetails.alertSummary.${formattedMessageId}`}
                        defaultMessage={defaultMessage}
                    />
                </h5>
            </EuiTitle>
            <EuiSpacer size="s" />
            {children}
        </EuiFlexItem>
    );
}

export { AlertSummary as default };
