/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormLabel, EuiText, EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { availableControlsPanels } from '../../hooks/use_control_panels_url_state';
import { Popover } from '../common/popover';

const helpMessages = {
  [availableControlsPanels.SERVICE_NAME]: (
    <EuiText size="xs">
      <FormattedMessage
        id="xpack.infra.hostsViewPage.serviceNameControl.popoverHelpLabel"
        defaultMessage="Services detected via {APMDocs}"
        values={{
          APMDocs: (
            <EuiLink
              href="https://ela.st/docs-infra-apm"
              target="_blank"
              data-test-subj="hostsViewServiceNameControlPopoverHelpLink"
            >
              <FormattedMessage
                id="xpack.infra.hostsViewPage.serviceNameControl.popoverHelpLink"
                defaultMessage="APM"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  ),
};

const TitleWithPopoverMessage = ({
  title,
  helpMessage,
  embeddableId,
}: {
  title?: string;
  helpMessage: React.ReactNode;
  embeddableId: string;
}) => {
  return (
    <EuiFormLabel className="controlFrame__formControlLayoutLabel" htmlFor={embeddableId}>
      <EuiFlexGroup alignItems="center" gutterSize="xs">
        <EuiFlexItem grow={false}>{title}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Popover>{helpMessage}</Popover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormLabel>
  );
};

export const ControlTitle = ({ title, embeddableId }: { title?: string; embeddableId: string }) => {
  const helpMessage = helpMessages[embeddableId];
  return helpMessage ? (
    <TitleWithPopoverMessage title={title} helpMessage={helpMessage} embeddableId={embeddableId} />
  ) : (
    <EuiFormLabel className="controlFrame__formControlLayoutLabel" htmlFor={embeddableId}>
      {title}
    </EuiFormLabel>
  );
};
