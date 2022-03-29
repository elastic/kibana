/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable } from '@elastic/eui';

import type { FormattedDgaResp } from './dga_inference';

export const DGAOutput: FC<{ result: FormattedDgaResp }> = ({ result }) => {
  if (result.length === 0) {
    return null;
  }

  const columns = [
    {
      field: 'domain',
      name: i18n.translate('xpack.ml.trainedModels.testSavedObjectsFlyout.dga.domain_title', {
        defaultMessage: 'Domain',
      }),
      truncateText: false,
      isExpander: false,
    },
    {
      field: 'maliciousPrediction',
      name: i18n.translate('xpack.ml.trainedModels.testSavedObjectsFlyout.dga.prediction_title', {
        defaultMessage: 'Prediction',
      }),
      width: '20%',
      truncateText: false,
      isExpander: false,
    },
    {
      field: 'maliciousProbability',
      name: i18n.translate('xpack.ml.trainedModels.testSavedObjectsFlyout.dga.probability_title', {
        defaultMessage: 'Probability',
      }),
      truncateText: false,
      isExpander: false,
    },
  ];

  return (
    <>
      <EuiBasicTable columns={columns} items={result} />
    </>
  );
};
