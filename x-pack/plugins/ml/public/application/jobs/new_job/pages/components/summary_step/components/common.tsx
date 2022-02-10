/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiTitle } from '@elastic/eui';

export interface ListItems {
  title: string;
  description: string | JSX.Element;
}

export const trueLabel = i18n.translate('xpack.ml.newJob.wizard.summaryStep.trueLabel', {
  defaultMessage: 'True',
});

export const falseLabel = i18n.translate('xpack.ml.newJob.wizard.summaryStep.falseLabel', {
  defaultMessage: 'False',
});

export const defaultLabel = i18n.translate('xpack.ml.newJob.wizard.summaryStep.defaultString', {
  defaultMessage: 'default',
});

export const JobSectionTitle: FC = () => (
  <EuiTitle size="s">
    <h3>
      <FormattedMessage
        id="xpack.ml.newJob.wizard.summaryStep.jobConfig.title"
        defaultMessage="Job configuration"
      />
    </h3>
  </EuiTitle>
);

export const DatafeedSectionTitle: FC = () => (
  <EuiTitle size="s">
    <h3>
      <FormattedMessage
        id="xpack.ml.newJob.wizard.summaryStep.datafeedConfig.title"
        defaultMessage="Datafeed configuration"
      />
    </h3>
  </EuiTitle>
);

export const Italic: FC = ({ children }) => <span style={{ fontStyle: 'italic' }}>{children}</span>;
