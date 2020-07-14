/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIcon, EuiText, IconType, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const EmptyPlaceholder = (props: { icon: IconType }) => (
  <>
    <EuiText className="lnsChart__empty" textAlign="center" color="subdued" size="xs">
      <EuiIcon type={props.icon} color="subdued" size="l" />
      <EuiSpacer size="s" />
      <p>
        <FormattedMessage
          id="xpack.lens.xyVisualization.noDataLabel"
          defaultMessage="No results found"
        />
      </p>
    </EuiText>
  </>
);
