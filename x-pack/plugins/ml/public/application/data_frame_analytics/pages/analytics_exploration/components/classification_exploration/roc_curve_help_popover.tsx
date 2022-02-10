/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  HelpPopover,
  HelpPopoverButton,
} from '../../../../../components/help_popover/help_popover';

export const RocCurveHelpPopover = () => {
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
      title={i18n.translate('xpack.ml.dataframe.analytics.rocCurvePopoverTitle', {
        defaultMessage: 'Receiver operating characteristic (ROC) curve',
      })}
    >
      <p>
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.rocCurveBasicExplanation"
          defaultMessage="The ROC curve is a plot that represents the performance of the classification process at different predicted probability thresholds."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.rocCurveCompute"
          defaultMessage="It compares the true positive rate (y-axis) for a specific class against the false positive rate (x-axis) at the different threshold levels to create the curve."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.rocCurveAuc"
          defaultMessage="From this plot, the area under the curve (AUC) value can be computed, which is a number between 0 and 1. The closer to 1, the better the algorithm performance."
        />
      </p>
    </HelpPopover>
  );
};
