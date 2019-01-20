/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiIcon, EuiToolTip } from '@elastic/eui';
import classNames from 'classnames';
import { isEmpty } from 'lodash/fp';
import moment from 'moment';
import React from 'react';
import styled from 'styled-components';

import { pure } from 'recompose';
import { QueryDate } from './data_provider';

const EuiBadgeStyled = styled(EuiBadge)`
  border: none;
  .euiToolTipAnchor {
    &::after {
      font-style: normal;
      content: '|';
      padding: 0px 3px;
    }
  }
  .field-value {
    font-weight: 200;
  }
  &.globalFilterItem {
    line-height: 28px;
    border: none;
    &.globalFilterItem-isDisabled {
      text-decoration: line-through;
      font-weight: 400;
      font-style: italic;
    }
  }
`;

interface ProviderBadgeProps {
  deleteProvider: () => void;
  field: string;
  kqlQuery: string;
  isEnabled: boolean;
  isExcluded: boolean;
  providerId: string;
  queryDate?: QueryDate;
  togglePopover?: () => void;
  val: string | number;
}

export const ProviderBadge = pure<ProviderBadgeProps>(
  ({ deleteProvider, field, isEnabled, isExcluded, queryDate, providerId, togglePopover, val }) => {
    const deleteFilter: React.MouseEventHandler<HTMLButtonElement> = (
      event: React.MouseEvent<HTMLButtonElement>
    ) => {
      // Make sure it doesn't also trigger the onclick for the whole badge
      if (event.stopPropagation) {
        event.stopPropagation();
      }
      deleteProvider();
    };
    const classes = classNames('globalFilterItem', {
      'globalFilterItem-isDisabled': !isEnabled,
      'globalFilterItem-isExcluded': isExcluded,
    });
    const prefix = isExcluded ? <span>NOT </span> : null;

    const title = `${field}: "${val}"`;

    const tooltipStr = isEmpty(queryDate)
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
        <span className="field-value">{field}: </span>
        <span className="field-value">&quot;{val}&quot;</span>
      </EuiBadgeStyled>
    );
  }
);
