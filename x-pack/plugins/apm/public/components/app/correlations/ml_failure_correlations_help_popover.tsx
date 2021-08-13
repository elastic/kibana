/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { HelpPopover, HelpPopoverButton } from '../help_popover/help_popover';

export function FailureCorrelationsHelpPopover() {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <HelpPopover
      anchorPosition="leftUp"
      button={
        <HelpPopoverButton
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
          }}
        />
      }
      closePopover={() => setIsPopoverOpen(false)}
      isOpen={isPopoverOpen}
      title={i18n.translate('xpack.apm.correlations.failurePopoverTitle', {
        defaultMessage: 'Failure correlations',
      })}
    >
      <p>
        <FormattedMessage
          id="xpack.apm.correlations.failurePopoverBasicExplanation"
          defaultMessage="Failure correlations highlight the most influential terms in the failed transactions compared to terms in non-failed transactions."
        />
      </p>
    </HelpPopover>
  );
}
