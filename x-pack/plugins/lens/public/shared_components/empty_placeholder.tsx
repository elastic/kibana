/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiText, IconType, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

const noResultsMessage = (
  <FormattedMessage id="xpack.lens.xyVisualization.noDataLabel" defaultMessage="No results found" />
);

export const EmptyPlaceholder = ({
  icon,
  message = noResultsMessage,
}: {
  icon: IconType;
  message?: JSX.Element;
}) => (
  <>
    <EuiText className="lnsChart__empty" textAlign="center" color="subdued" size="xs">
      <EuiIcon type={icon} color="subdued" size="l" />
      <EuiSpacer size="s" />
      <p>{message}</p>
    </EuiText>
  </>
);
