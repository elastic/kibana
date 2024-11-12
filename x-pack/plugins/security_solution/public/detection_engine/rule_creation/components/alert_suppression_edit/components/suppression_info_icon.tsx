/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiPopover, EuiText, EuiButtonIcon } from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../../common/lib/kibana';

const POPOVER_WIDTH = 320;

/**
 * Icon and popover that gives hint to users how suppression for missing fields work
 */
export function SuppressionInfoIcon(): JSX.Element {
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);
  const { docLinks } = useKibana().services;

  const button = (
    <EuiButtonIcon
      iconType="questionInCircle"
      onClick={togglePopover}
      aria-label="Open help popover"
    />
  );

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiText style={{ width: POPOVER_WIDTH }} size="s">
        <FormattedMessage
          id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.alertSuppressionMissingFieldsTooltipContent"
          defaultMessage="Choose how to handle events with missing {suppressBy} fields. Either group events with missing fields together, or create a separate alert for each event. {learnMoreLink}"
          values={{
            suppressBy: (
              <strong>
                <FormattedMessage
                  id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.alertSuppressionMissingFieldsTooltipSuppressByDescription"
                  defaultMessage="Suppress alerts by"
                />
              </strong>
            ),
            learnMoreLink: (
              <EuiLink href={docLinks.links.siem.configureAlertSuppression} target="_blank">
                <FormattedMessage
                  id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.alertSuppressionMissingFieldsTooltipLink"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </EuiPopover>
  );
}
