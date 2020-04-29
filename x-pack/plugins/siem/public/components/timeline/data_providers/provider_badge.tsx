/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import classNames from 'classnames';
import { isString } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { getEmptyString } from '../../empty_value';
import { WithCopyToClipboard } from '../../../lib/clipboard/with_copy_to_clipboard';
import { WithHoverActions } from '../../with_hover_actions';

import { EXISTS_OPERATOR, QueryOperator } from './data_provider';

import * as i18n from './translations';

const ProviderBadgeStyled = (styled(EuiBadge)`
  .euiToolTipAnchor {
    &::after {
      font-style: normal;
      content: '|';
      padding: 0px 3px;
    }
  }
  &.globalFilterItem {
    white-space: nowrap;
    &.globalFilterItem-isDisabled {
      text-decoration: line-through;
      font-weight: 400;
      font-style: italic;
    }
  }
  .euiBadge.euiBadge--iconLeft &.euiBadge.euiBadge--iconRight .euiBadge__content {
    flex-direction: row;
  }
  .euiBadge.euiBadge--iconLeft
    &.euiBadge.euiBadge--iconRight
    .euiBadge__content
    .euiBadge__iconButton {
    margin-right: 0;
    margin-left: 4px;
  }
` as unknown) as typeof EuiBadge;

ProviderBadgeStyled.displayName = 'ProviderBadgeStyled';

interface ProviderBadgeProps {
  deleteProvider: () => void;
  field: string;
  kqlQuery: string;
  isEnabled: boolean;
  isExcluded: boolean;
  providerId: string;
  togglePopover: () => void;
  val: string | number;
  operator: QueryOperator;
}

const closeButtonProps = {
  // Removing tab focus on close button because the same option can be obtained through the context menu
  // TODO: add a `DEL` keyboard press functionality
  tabIndex: -1,
};

export const ProviderBadge = React.memo<ProviderBadgeProps>(
  ({ deleteProvider, field, isEnabled, isExcluded, operator, providerId, togglePopover, val }) => {
    const deleteFilter: React.MouseEventHandler<HTMLButtonElement> = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        // Make sure it doesn't also trigger the onclick for the whole badge
        if (event.stopPropagation) {
          event.stopPropagation();
        }
        deleteProvider();
      },
      [deleteProvider]
    );

    const classes = useMemo(
      () =>
        classNames('globalFilterItem', {
          'globalFilterItem-isDisabled': !isEnabled,
          'globalFilterItem-isExcluded': isExcluded,
        }),
      [isEnabled, isExcluded]
    );

    const formattedValue = useMemo(() => (isString(val) && val === '' ? getEmptyString() : val), [
      val,
    ]);

    const prefix = useMemo(() => (isExcluded ? <span>{i18n.NOT} </span> : null), [isExcluded]);

    const title = useMemo(() => `${field}: "${formattedValue}"`, [field, formattedValue]);

    const hoverContent = useMemo(
      () => (
        <WithCopyToClipboard
          data-test-subj="copy-to-clipboard"
          text={`${field} : ${typeof val === 'string' ? `"${val}"` : `${val}`}`}
          titleSummary={i18n.FIELD}
        />
      ),
      [field, val]
    );

    const badge = useCallback(
      () => (
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
          onClickAriaLabel={`${i18n.SHOW_OPTIONS_DATA_PROVIDER} ${formattedValue}`}
          closeButtonProps={closeButtonProps}
          data-test-subj="providerBadge"
        >
          {prefix}
          {operator !== EXISTS_OPERATOR ? (
            <>
              <span className="field-value">{`${field}: `}</span>
              <span className="field-value">{`"${formattedValue}"`}</span>
            </>
          ) : (
            <span className="field-value">
              {field} {i18n.EXISTS_LABEL}
            </span>
          )}
        </ProviderBadgeStyled>
      ),
      [
        providerId,
        field,
        val,
        classes,
        title,
        deleteFilter,
        togglePopover,
        formattedValue,
        closeButtonProps,
        prefix,
        operator,
      ]
    );

    return <WithHoverActions hoverContent={hoverContent} render={badge} />;
  }
);

ProviderBadge.displayName = 'ProviderBadge';
