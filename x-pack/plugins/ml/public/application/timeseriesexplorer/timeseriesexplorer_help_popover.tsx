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
          defaultMessage="This chart illustrates the actual data values over time for a specific detector. You can examine an event by sliding the time selector and changing its length. For the most accurate view, set the zoom size to auto."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.timeSeriesExplorer.popoverAnomalyExplanation"
          defaultMessage="An anomaly score is calculated for each bucket time interval, with a value from 0 to 100. Anomalous events are highlighted in colors that indicate their severity. If an anomaly is depicted with a cross symbol instead of a dot, it has a medium or high multi-bucket impact. This extra analysis can catch anomalies even when they fall within the bounds of expected behavior."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.timeSeriesExplorer.popoverForecastExplanation"
          defaultMessage="If you create a forecast, predicted data values are added to the chart. A shaded area around these values represents the confidence level; as you forecast further into the future, the confidence level generally decreases."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.timeSeriesExplorer.popoverAnnotationsExplanation"
          defaultMessage="You can also optionally annotate your job results by drag-selecting a period of time in the chart and adding a description. Some annotations are generated automatically to indicate noteworthy occurrences."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.timeSeriesExplorer.popoverModelPlotExplanation"
          defaultMessage="If model plot is enabled, you can optionally show model bounds, which are represented by a shaded area in the chart. As the job analyzes more data, it learns to more closely predict the expected patterns of behavior."
        />
      </p>
    </HelpPopover>
  );
};
