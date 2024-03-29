/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { DataViewDescriptor } from '../../../../common/data_views/models/data_view_descriptor';
import { openDiscoverLabel } from '../constants';

interface DataViewMenuItemProps {
  dataView: DataViewDescriptor;
  isAvailable: boolean;
}

const rightSpacing = css`
  margin-right: ${euiThemeVars.euiSizeS};
`;

export const DataViewMenuItem = ({ dataView, isAvailable }: DataViewMenuItemProps) => {
  if (isAvailable) {
    return <span>{dataView.name}</span>;
  }

  return (
    <>
      <span css={rightSpacing}>{dataView.name}</span>
      <EuiToolTip content={openDiscoverLabel}>
        <EuiIcon type="popout" color="subdued" />
      </EuiToolTip>
    </>
  );
};
