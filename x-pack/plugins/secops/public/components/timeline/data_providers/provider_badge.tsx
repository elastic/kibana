/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiIcon, EuiToolTip } from '@elastic/eui';
import classNames from 'classnames';
import { isEmpty, values } from 'lodash/fp';
import moment from 'moment';
import React from 'react';
import styled from 'styled-components';

import { pure } from 'recompose';
import { QueryDate } from './data_provider';

const EuiBadgeStyled = styled(EuiBadge)`
  line-height: 28px;
  border: none;
`;

interface ProviderBadgeProps {
  deleteFilter: (event: React.MouseEvent<HTMLButtonElement>) => void;
  field: string;
  kqlQuery: string;
  isDisabled: boolean;
  isExcluded: boolean;
  providerId: string;
  queryDate?: QueryDate;
  togglePopover?: () => void;
  val: string | number;
}

const isDateObjectEmpty = (date: QueryDate | undefined | null) => {
  if (isEmpty(date)) {
    return true;
  }
  return !values(date).some(d => !isEmpty(d));
};

export const ProviderBadge = pure<ProviderBadgeProps>(
  ({ deleteFilter, field, isDisabled, isExcluded, queryDate, providerId, togglePopover, val }) => {
    const classes = classNames('globalFilterItem', {
      'globalFilterItem-isDisabled': isDisabled,
      'globalFilterItem-isExcluded': isExcluded,
    });
    const prefix = isExcluded ? <span>NOT </span> : null;

    const title = `${field}: "${val}"`;

    const tooltipStr = isDateObjectEmpty(queryDate!)
      ? null
      : `${moment(queryDate!.from).format('L LTS')} - ${moment(queryDate!.to).format('L LTS')}`;

    return (
      <EuiBadgeStyled
        id={`${providerId}-${field}-${val}`}
        className={classes}
        title={title}
        iconOnClick={deleteFilter}
        iconOnClickAriaLabel={`Delete filter`}
        iconType="cross"
        iconSide="right"
        onClick={togglePopover}
        onClickAriaLabel={`Show Filter ${val} in timeline`}
        closeButtonProps={{
          // Removing tab focus on close button because the same option can be optained through the context menu
          // Also, we may want to add a `DEL` keyboard press functionality
          tabIndex: '-1',
        }}
      >
        {tooltipStr !== null && (
          <EuiToolTip data-test-subj="add-tool-tip" content={tooltipStr} position="bottom">
            <EuiIcon type="calendar" />
          </EuiToolTip>
        )}
        {prefix}
        <span>{field}: </span>
        <span>&quot;{val}&quot;</span>
      </EuiBadgeStyled>
    );
  }
);
