/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { get } from 'lodash';
import {
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiLink,
  EuiHorizontalRule,
  EuiDescriptionList,
  EuiFlyoutBody,
} from '@elastic/eui';
import {
  ALERT_DURATION,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_UUID,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
} from '@kbn/rule-data-utils';
import moment from 'moment-timezone';
import { useKibana, useUiSetting } from '@kbn/kibana-react-plugin/public';
import { RULE_DETAILS_PAGE_ID } from '../../../rule_details/constants';
import { asDuration } from '../../../../../common/utils/formatters';
import { translations, paths } from '../../../../config';
import { AlertStatusIndicator } from '../../../../components/shared/alert_status_indicator';
import { FlyoutProps } from './types';

// eslint-disable-next-line import/no-default-export
export default function AlertsFlyoutBody({ alert, id: pageId }: FlyoutProps) {
  const { services } = useKibana();
  const { http } = services;
  const dateFormat = useUiSetting<string>('dateFormat');
  const prepend = http?.basePath.prepend;
  const ruleId = get(alert.fields, ALERT_RULE_UUID) ?? null;
  const linkToRule =
    pageId !== RULE_DETAILS_PAGE_ID && ruleId && prepend
      ? prepend(paths.observability.ruleDetails(ruleId))
      : null;
  const overviewListItems = [
    {
      title: translations.alertsFlyout.statusLabel,
      description: (
        <AlertStatusIndicator
          alertStatus={alert.active ? ALERT_STATUS_ACTIVE : ALERT_STATUS_RECOVERED}
        />
      ),
    },
    {
      title: translations.alertsFlyout.startedAtLabel,
      description: (
        <span title={alert.start.toString()}>{moment(alert.start).format(dateFormat)}</span>
      ),
    },
    {
      title: translations.alertsFlyout.lastUpdatedLabel,
      description: (
        <span title={alert.lastUpdated.toString()}>
          {moment(alert.lastUpdated).format(dateFormat)}
        </span>
      ),
    },
    {
      title: translations.alertsFlyout.durationLabel,
      description: asDuration(alert.fields[ALERT_DURATION], { extended: true }),
    },
    {
      title: translations.alertsFlyout.expectedValueLabel,
      description: alert.fields[ALERT_EVALUATION_THRESHOLD] ?? '-',
    },
    {
      title: translations.alertsFlyout.actualValueLabel,
      description: alert.fields[ALERT_EVALUATION_VALUE] ?? '-',
    },
    {
      title: translations.alertsFlyout.ruleTypeLabel,
      description: alert.fields[ALERT_RULE_CATEGORY] ?? '-',
    },
  ];

  return (
    <EuiFlyoutBody>
      <EuiTitle size="xs">
        <h4>{translations.alertsFlyout.reasonTitle}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">{alert.reason}</EuiText>
      <EuiSpacer size="s" />
      {!!linkToRule && (
        <EuiLink href={linkToRule} data-test-subj="viewRuleDetailsFlyout">
          {translations.alertsFlyout.viewRulesDetailsLinkText}
        </EuiLink>
      )}
      <EuiHorizontalRule size="full" />
      <EuiTitle size="xs">
        <h4>{translations.alertsFlyout.documentSummaryTitle}</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiDescriptionList
        compressed={true}
        type="responsiveColumn"
        listItems={overviewListItems}
        titleProps={{
          'data-test-subj': 'alertsFlyoutDescriptionListTitle',
        }}
        descriptionProps={{
          'data-test-subj': 'alertsFlyoutDescriptionListDescription',
        }}
      />
    </EuiFlyoutBody>
  );
}
