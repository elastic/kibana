/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt, EuiEmptyPromptProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  heading?: string;
  subheading?: EuiEmptyPromptProps['body'];
  hideSubheading?: boolean;
}

const EmptyMessage: React.FC<Props> = ({
  heading = i18n.translate('xpack.apm.emptyMessage.noDataFoundLabel', {
    defaultMessage: 'No data found.'
  }),
  subheading = i18n.translate('xpack.apm.emptyMessage.noDataFoundDescription', {
    defaultMessage: 'Try another time range or reset the search filter.'
  }),
  hideSubheading = false
}) => {
  return (
    <EuiEmptyPrompt
      titleSize="s"
      title={<div>{heading}</div>}
      body={!hideSubheading && subheading}
    />
  );
};

export { EmptyMessage };
