/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiIcon, EuiToolTip } from '@elastic/eui';
<<<<<<< HEAD
=======
import { FormattedMessage } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import { isReservedSpace } from '../../../../common';
import { Space } from '../../../../common/model/space';

interface Props {
  space?: Space;
}

export const ReservedSpaceBadge = (props: Props) => {
  const { space } = props;

  if (space && isReservedSpace(space)) {
    return (
<<<<<<< HEAD
      <EuiToolTip content={'Reserved spaces are built-in and can only be partially modified.'}>
=======
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.spaces.management.reversedSpaceBadge.reversedSpacesCanBePartiallyModifiedTooltip"
            defaultMessage="Reserved spaces are built-in and can only be partially modified."
          />
        }
      >
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        <EuiIcon style={{ verticalAlign: 'super' }} type={'lock'} />
      </EuiToolTip>
    );
  }
  return null;
};
