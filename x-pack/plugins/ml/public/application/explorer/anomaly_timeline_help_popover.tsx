/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { HelpPopover, HelpPopoverButton } from '../components/help_popover/help_popover';

export const AnomalyTimelineHelpPopover = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <HelpPopover
      anchorPosition="upCenter"
      button={
        <HelpPopoverButton
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
          }}
        />
      }
      closePopover={() => setIsPopoverOpen(false)}
      isOpen={isPopoverOpen}
      title={i18n.translate('xpack.ml.explorer.anomalyTimelinePopoverTitle', {
        defaultMessage: 'Anomaly timelines',
      })}
    >
      <p>
        <FormattedMessage
          id="xpack.ml.explorer.anomalyTimelinePopoverBasicExplanation"
          defaultMessage="Swim lanes provide an overview of the buckets of data that have been analyzed within the selected time period. You can view an overall swim lane or view them by job or influencer."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.explorer.anomalyTimelinePopoverScoreExplanation"
          defaultMessage="Each block in a swim lane is colored according to its anomaly score, which is a value from 0 to 100. The blocks with high scores are shown in red and low scores are indicated in blue."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.explorer.anomalyTimelinePopoverAdvancedExplanation"
          defaultMessage="The anomaly scores that you see in each section of the Anomaly Explorer might differ slightly. This disparity occurs because for each job there are bucket results, overall bucket results, influencer results, and record results. Anomaly scores are generated for each type of result. The overall swim lane shows the maximum overall bucket score for each block. When you view a swim lane by job, it shows the maximum bucket score in each block. When you view by influencer, it shows the maximum influencer score in each block."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.explorer.anomalyTimelinePopoverSelectionExplanation"
          defaultMessage="When you select one or more blocks in the swim lanes, the list of anomalies and top influencers is likewise filtered to provide information relative to that selection."
        />
      </p>
    </HelpPopover>
  );
};
