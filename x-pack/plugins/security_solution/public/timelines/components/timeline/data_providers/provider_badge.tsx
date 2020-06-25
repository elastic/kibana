/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiButtonEmpty } from '@elastic/eui';
import classNames from 'classnames';
import { isString } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { TimelineType } from '../../../../../common/types/timeline';
import { getEmptyString } from '../../../../common/components/empty_value';
import { ProviderContainer } from '../../../../common/components/drag_and_drop/provider_container';

import { DataProviderType, EXISTS_OPERATOR, QueryOperator } from './data_provider';

import * as i18n from './translations';

type ProviderBadgeStyledType = typeof EuiBadge & {
  type: DataProviderType;
};

const ProviderBadgeStyled = styled(EuiBadge)<ProviderBadgeStyledType>`
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
    &.globalFilterItem-isError {
      box-shadow: 0 1px 1px -1px rgba(152, 162, 179, 0.2), 0 3px 2px -2px rgba(152, 162, 179, 0.2),
        inset 0 0 0 1px #bd271e;
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
  ${({ type }) =>
    type === DataProviderType.template &&
    `
      &.globalFilterItem {
        background: #f8e9e9
      }
  `}
`;

ProviderBadgeStyled.displayName = 'ProviderBadgeStyled';

const ProviderFieldBadge = styled.div`
  display: block;
  color: #fff;
  padding: 4px 0 4px 6px;
  font-size: 0.6em;
  text-transform: uppercase;
`;

const TemplateFieldBadge = styled(ProviderFieldBadge)`
  background: #dd0a73;
  padding: 4px 0 4px 6px;
  font-size: 0.6em;
  text-transform: uppercase;
`;

const TimelineFieldBadge = styled(ProviderFieldBadge)`
  background: #98a2b3;
`;

const TimelineFieldBadgeButton = styled(EuiButtonEmpty)``;

interface ProviderBadgeProps {
  deleteProvider: () => void;
  field: string;
  kqlQuery: string;
  isEnabled: boolean;
  isExcluded: boolean;
  isInvalid: boolean;
  providerId: string;
  togglePopover: () => void;
  toggleType: () => void;
  val: string | number;
  operator: QueryOperator;
  type: DataProviderType;
  timelineType: TimelineType;
}

const closeButtonProps = {
  // Removing tab focus on close button because the same option can be obtained through the context menu
  // TODO: add a `DEL` keyboard press functionality
  tabIndex: -1,
};

export const ProviderBadge = React.memo<ProviderBadgeProps>(
  ({
    deleteProvider,
    field,
    isEnabled,
    isExcluded,
    isInvalid,
    operator,
    providerId,
    togglePopover,
    toggleType,
    val,
    type,
    timelineType,
  }) => {
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
          'globalFilterItem-isError': isInvalid,
        }),
      [isEnabled, isExcluded, isInvalid]
    );

    const formattedValue = useMemo(() => (isString(val) && val === '' ? getEmptyString() : val), [
      val,
    ]);

    const prefix = useMemo(() => (isExcluded ? <span>{i18n.NOT} </span> : null), [isExcluded]);

    const content = useMemo(
      () => (
        <>
          {prefix}
          {operator !== EXISTS_OPERATOR ? (
            <span className="field-value">{`${field}: "${formattedValue}"`}</span>
          ) : (
            <span className="field-value">
              {field} {i18n.EXISTS_LABEL}
            </span>
          )}
        </>
      ),
      [field, formattedValue, operator, prefix]
    );

    return (
      <ProviderContainer>
        <>
          <ProviderBadgeStyled
            id={`${providerId}-${field}-${val}`}
            className={classes}
            color="hollow"
            title=""
            iconOnClick={deleteFilter}
            iconOnClickAriaLabel={i18n.REMOVE_DATA_PROVIDER}
            iconType="cross"
            iconSide="right"
            onClick={togglePopover}
            onClickAriaLabel={`${i18n.SHOW_OPTIONS_DATA_PROVIDER} ${formattedValue}`}
            closeButtonProps={closeButtonProps}
            data-test-subj="providerBadge"
            type={type}
          >
            {content}
          </ProviderBadgeStyled>
          {type === DataProviderType.template && (
            <TemplateFieldBadge>{'Template field'}</TemplateFieldBadge>
          )}
          {timelineType === TimelineType.template && (
            <TimelineFieldBadge>
              <EuiButtonEmpty onClick={toggleType} size="xs">
                {type === DataProviderType.template
                  ? i18n.CONVERT_TO_FIELD
                  : i18n.CONVERT_TO_TEMPLATE_FIELD}
              </EuiButtonEmpty>
            </TimelineFieldBadge>
          )}
        </>
      </ProviderContainer>
    );
  }
);

ProviderBadge.displayName = 'ProviderBadge';
