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

export const MulticlassConfusionMatrixHelpPopover = () => {
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
      title={i18n.translate('xpack.ml.dataframe.analytics.confusionMatrixPopoverTitle', {
        defaultMessage: 'Normalized confusion matrix',
      })}
    >
      <p>
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.confusionMatrixBasicExplanation"
          defaultMessage="The multiclass confusion matrix provides a summary of the performance of the classification analysis. It contains the proportion of the data points that the analysis classified correctly with their actual class as well as the proportion of the misclassified data points."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.confusionMatrixAxisExplanation"
          defaultMessage="The matrix contains the actual labels on the left side while the predicted labels are on the top. The proportion of correct and incorrect predictions is broken down for each class. This enables you to examine how the classification analysis confused the different classes while it made its predictions. If you want to see the exact number of occurrences, select a cell in the matrix and click the appearing icon."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.confusionMatrixShadeExplanation"
          defaultMessage="As the number of classes in the classification analysis increases, the confusion matrix also increases in complexity. For an easier overview, darker cells indicate higher percentage of the predictions."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.confusionMatrixColumnExplanation"
          defaultMessage="The Columns selector enables you to toggle between showing or hiding some of the columns or all of them."
        />
      </p>
    </HelpPopover>
  );
};
