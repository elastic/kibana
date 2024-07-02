/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiToolTip, EuiText, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PROCESS_DESCENDANT_EVENT_FILTER_EXTRA_ENTRY_TEXT } from '../../../../../../common/endpoint/service/artifacts/constants';

interface ProcessDescendantsTooltipProps {
  testIdPrefix?: string;
  indicateExtraEntry?: boolean;
}

export const ProcessDescendantsTooltip = memo<ProcessDescendantsTooltipProps>(
  ({ testIdPrefix, indicateExtraEntry = false }: ProcessDescendantsTooltipProps) => {
    return (
      <EuiToolTip
        content={
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.filterProcessDescendants.tooltip"
                defaultMessage="Filtering the descendants of a process means that events from the matched process are ingested, but events from its descendant processes are omitted."
              />
            </p>
            {indicateExtraEntry && (
              <>
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.eventFilters.filterProcessDescendants.tooltipExtraEntry"
                    defaultMessage="Note: the following additional condition is applied:"
                  />
                </p>
                <p>
                  <code>{PROCESS_DESCENDANT_EVENT_FILTER_EXTRA_ENTRY_TEXT}</code>
                </p>
              </>
            )}
            <p>
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.filterProcessDescendants.tooltipVersionInfo"
                defaultMessage="Process descendant filtering works only with Agents v8.15 and newer."
              />
            </p>
          </EuiText>
        }
        data-test-subj={testIdPrefix !== undefined ? `${testIdPrefix}-tooltipText` : undefined}
      >
        <EuiIcon
          type="iInCircle"
          data-test-subj={testIdPrefix !== undefined ? `${testIdPrefix}-tooltipIcon` : undefined}
        />
      </EuiToolTip>
    );
  }
);
ProcessDescendantsTooltip.displayName = 'ProcessDescendantsTooltip';
