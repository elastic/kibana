/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { ProcessorType } from './map_processor_type_to_form';

interface Props {
  processorType: ProcessorType | string;
  docLink: string;
}

export const LearnMoreFormLabel: FunctionComponent<Props> = ({ processorType, docLink }) => {
  return (
    <FormattedMessage
      id="xpack.ingestPipelines.pipelineEditor.settingsForm.learnMoreLabelLink"
      defaultMessage="Learn more about the {processorLink}."
      values={{
        processorLink: (
          <EuiLink target="_blank" href={docLink}>
            {processorType}
            &nbsp;
            {i18n.translate(
              'xpack.ingestPipelines.pipelineEditor.settingsForm.learnMoreLabelLink.processor',
              { defaultMessage: 'processor' }
            )}
          </EuiLink>
        ),
      }}
    />
  );
};
