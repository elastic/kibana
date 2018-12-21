/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt, EuiEmptyPromptProps } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';

interface Props {
  heading?: string;
  subheading?: EuiEmptyPromptProps['body'];
  hideSubheading?: boolean;
  intl: InjectedIntl;
}

// tslint:disable-next-line:no-shadowed-variable
const EmptyMessage = injectI18n(function EmptyMessage({
  intl,
  heading = intl.formatMessage({
    id: 'xpack.apm.emptyMessage.noDataFoundLabel',
    defaultMessage: 'No data found.'
  }),
  subheading = intl.formatMessage({
    id: 'xpack.apm.emptyMessage.noDataFoundDescription',
    defaultMessage: 'Try another time range or reset the search filter.'
  }),
  hideSubheading = false
}: Props) {
  return (
    <EuiEmptyPrompt
      titleSize="s"
      title={<div>{heading}</div>}
      body={!hideSubheading && subheading}
    />
  );
});

export { EmptyMessage };
