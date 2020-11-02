/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  processorLabel: string;
  docLink: string;
}

export const DocumentationButton: FunctionComponent<Props> = ({ processorLabel, docLink }) => {
  return (
    <EuiButtonEmpty size="s" flush="right" href={docLink} target="_blank" iconType="help">
      {i18n.translate(
        'xpack.ingestPipelines.pipelineEditor.settingsForm.learnMoreLabelLink.processor',
        { defaultMessage: '{processorLabel} documentation', values: { processorLabel } }
      )}
    </EuiButtonEmpty>
  );
};
