/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { AlertsFlyoutProps, AlertsField } from '../../../../types';

const REASON_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.reason',
  {
    defaultMessage: 'Reason',
  }
);

const NEXT_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.next',
  {
    defaultMessage: 'Next',
  }
);
const PREVIOUS_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.previous',
  {
    defaultMessage: 'Previous',
  }
);

export const AlertsFlyout: React.FunctionComponent<AlertsFlyoutProps> = ({
  alert,
  onClose,
  onPaginateNext,
  onPaginatePrevious,
}: AlertsFlyoutProps) => {
  return (
    <EuiFlyout onClose={onClose} size="s" data-test-subj="alertsFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m" data-test-subj="alertsFlyoutTitle">
          <h2>{get(alert, AlertsField.name)}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTitle size="xs">
          <h4>{REASON_LABEL}</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">{get(alert, AlertsField.reason)}</EuiText>
        <EuiSpacer size="s" />
        {/* {!!linkToRule && (
          <EuiLink href={linkToRule} data-test-subj="viewRuleDetailsFlyout">
            {translations.alertsFlyout.viewRulesDetailsLinkText}
          </EuiLink>
        )} */}
        <EuiHorizontalRule size="full" />
        {/* dynamic content */}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="alertsFlyoutPaginateNext" fill onClick={onPaginatePrevious}>
              {PREVIOUS_LABEL}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="alertsFlyoutPaginatePrevious" fill onClick={onPaginateNext}>
              {NEXT_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
