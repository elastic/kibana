/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React from 'react';

interface Props {
  children?: React.ReactElement;
  showTooltip: boolean;
}

export const CreateDataViewToolTip: FC<Props> = ({ children, showTooltip }) => {
  return (
    <EuiToolTip
      position="top"
      content={
        showTooltip ? (
          <FormattedMessage
            id="xpack.dataVisualizer.file.cannotCreateDataView.tooltip"
            defaultMessage="You need permission to create data views."
          />
        ) : null
      }
    >
      {children}
    </EuiToolTip>
  );
};
