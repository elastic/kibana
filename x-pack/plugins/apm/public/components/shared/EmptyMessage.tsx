/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt, EuiEmptyPromptProps } from '@elastic/eui';
import React from 'react';

interface Props {
  heading?: string;
  subheading?: EuiEmptyPromptProps['body'];
  hideSubheading?: boolean;
}

const EmptyMessage: React.SFC<Props> = ({
  heading = 'No data found.',
  subheading = 'Try another time range or reset the search filter.',
  hideSubheading = false
}) => {
  return (
    <EuiEmptyPrompt
      titleSize="s"
      title={<div>{heading || 'No data found.'}</div>}
      body={!hideSubheading && subheading}
    />
  );
};

export { EmptyMessage };
