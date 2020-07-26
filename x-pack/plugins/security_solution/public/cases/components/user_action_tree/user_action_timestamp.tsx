/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';

import { LocalizedDateTooltip } from '../../../common/components/localized_date_tooltip';
import * as i18n from './translations';

interface UserActionAvatarProps {
  createdAt: string;
  updatedAt?: string | null;
}

const UserActionTimestampComponent = ({ createdAt, updatedAt }: UserActionAvatarProps) => {
  return (
    <>
      <LocalizedDateTooltip date={new Date(createdAt)}>
        <FormattedRelative
          data-test-subj="user-action-title-creation-relative-time"
          value={createdAt}
        />
      </LocalizedDateTooltip>
      {updatedAt && (
        <EuiText size="s" color="subdued">
          {'('}
          {i18n.EDITED_FIELD}{' '}
          <LocalizedDateTooltip date={new Date(updatedAt)}>
            <FormattedRelative
              data-test-subj="user-action-title-edited-relative-time"
              value={updatedAt}
            />
          </LocalizedDateTooltip>
          {')'}
        </EuiText>
      )}
    </>
  );
};

export const UserActionTimestamp = memo(UserActionTimestampComponent);
