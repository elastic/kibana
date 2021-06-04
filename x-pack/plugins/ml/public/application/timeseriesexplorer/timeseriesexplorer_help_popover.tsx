/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { HelpPopover, HelpPopoverButton } from '../components/help_popover/help_popover';

export const TimeSeriesExplorerHelpPopover = () => {
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
      title={i18n.translate('xpack.ml.timeSeriesExplorer.popoverTitle', {
        defaultMessage: 'Single time series analysis',
      })}
    >
      <p>
        <FormattedMessage
          id="xpack.ml.timeSeriesExplorer.popoverBasicExplanation"
          defaultMessage="Anomaly detection jobs analyze your data and create models to identify anomalous patterns of behavior. If the job has model plot enabled, you can view a chart that represents the actual and expected values over time."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.timeSeriesExplorer.popoverBoundsExplanation"
          defaultMessage="The blue line in the chart represents the actual data values. The shaded blue area represents the bounds for the expected values. The area between the upper and lower bounds are the most likely values for the model. As the job analyzes more data, it learns to more closely predict the patterns of behavior."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.timeSeriesExplorer.popoverScoreExplanation"
          defaultMessage="Any data points outside the model bounds are marked as anomalies. An anomaly score is calcuated for each bucket time interval, with a value from 0 to 100. The highly anomalous data points are shown in red and data points with low scores are blue."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.timeSeriesExplorer.popoverMultiBucketsExplanation"
          defaultMessage="If an anomaly is depicted with a cross symbol instead of a dot, it is anomalous relative to its neighboring buckets. This multi-bucket analysis evaluates events in each bucket relative to the larger context of recent events and can catch anomalies even when they fall within the bounds of expected behavior."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.timeSeriesExplorer.popoverAnnotationsExplanation"
          defaultMessage="You can optionally annotate your job results by drag-selecting a period of time in the chart and adding a description. Some annotations are also generated automatically to indicate noteworthy occurrences."
        />
      </p>
    </HelpPopover>
  );
};
