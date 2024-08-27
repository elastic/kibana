/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const emptyPromptTitle = i18n.translate('xpack.datasetQuality.details.emptypromptTitle', {
  defaultMessage: 'Unable to load your data stream',
});

const emptyPromptBody = (dataStream: string) =>
  i18n.translate('xpack.datasetQuality.details.emptyPromptBody', {
    defaultMessage: 'Data stream not found: {dataStream}',
    values: {
      dataStream,
    },
  });

export function DataStreamNotFoundPrompt({ dataStream }: { dataStream: string }) {
  const promptTitle = <h2>{emptyPromptTitle}</h2>;
  const promptBody = (
    <EuiText data-test-subj="datasetQualityDetailsEmptyPromptBody">
      <p>{emptyPromptBody(dataStream)}</p>
    </EuiText>
  );

  return (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      title={promptTitle}
      body={promptBody}
      data-test-subj="datasetQualityDetailsEmptyPrompt"
    />
  );
}
