/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Space } from '../../../../../../src/plugins/spaces_oss/common';
import { isReservedSpace } from '../../../common';

interface Props {
  space?: Space;
}

export const ReservedSpaceBadge = (props: Props) => {
  const { space } = props;

  if (space && isReservedSpace(space)) {
    return (
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.spaces.management.reversedSpaceBadge.reversedSpacesCanBePartiallyModifiedTooltip"
            defaultMessage="Reserved spaces are built-in and can only be partially modified."
          />
        }
      >
        <EuiBadge color="warning" iconType="questionInCircle" iconSide="right">
          Reserved space
        </EuiBadge>
      </EuiToolTip>
    );
  }
  return null;
};
