/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import * as i18n from './translations';

const ProviderBadgeStyled = styled(EuiBadge)`
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
  togglePopover?: () => void;
  val: string | number;
}

export const ProviderBadge = pure<ProviderBadgeProps>(
  ({ deleteProvider, field, isEnabled, isExcluded, providerId, togglePopover, val }) => {
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
    const prefix = isExcluded ? <span>{i18n.NOT} </span> : null;

    const title = `${field}: "${val}"`;

    return (
      <ProviderBadgeStyled
        id={`${providerId}-${field}-${val}`}
        className={classes}
        color="hollow"
        title={title}
        iconOnClick={deleteFilter}
        iconOnClickAriaLabel={i18n.REMOVE_DATA_PROVIDER}
        iconType="cross"
        iconSide="right"
        onClick={togglePopover}
        onClickAriaLabel={`${i18n.SHOW_OPTIONS_DATA_PROVIDER} ${val}`}
        closeButtonProps={{
          // Removing tab focus on close button because the same option can be obtained through the context menu
          // TODO: add a `DEL` keyboard press functionality
          tabIndex: '-1',
        }}
        data-test-subj="providerBadge"
      >
        {prefix}
        <span className="field-value">{field}: </span>
        <span className="field-value">&quot;{val}&quot;</span>
      </ProviderBadgeStyled>
    );
  }
);
