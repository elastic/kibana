/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip, EuiText, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface ProcessDescendantsTooltipProps {
  testIdPrefix?: string;
}

export const ProcessDescendantsTooltip = ({ testIdPrefix }: ProcessDescendantsTooltipProps) => (
  <EuiToolTip
    content={
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.securitySolution.eventFilters.filterProcessDescendants.tooltip"
            defaultMessage="Filtering the descendants of a process means that events from the matched process are ingested, but events from its descendant processes are omitted."
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.securitySolution.eventFilters.filterProcessDescendants.tooltipVersionInfo"
            defaultMessage="Process descendant filtering works only with Agents v8.15 and newer."
          />
        </p>
      </EuiText>
    }
    data-test-subj={testIdPrefix && `${testIdPrefix}-tooltipText`}
  >
    <EuiIcon type="iInCircle" data-test-subj={testIdPrefix && `${testIdPrefix}-tooltipIcon`} />
  </EuiToolTip>
);
