/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  EuiLink,
  EuiPopover,
  EuiToolTip,
  EuiText,
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import styled from 'styled-components';
import { SecurityCellActions, CellActionsMode, SecurityCellActionsTrigger } from '../cell_actions';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue } from '../empty_value';
import { MoreRowItems } from '../page';
import { MoreContainer } from '../../../timelines/components/field_renderers/more_container';

const Subtext = styled.div`
  font-size: ${(props) => props.theme.eui.euiFontSizeXS};
`;

interface GetRowItemsWithActionsParams {
  values: string[] | null | undefined;
  fieldName: string;
  idPrefix: string;
  render?: (item: string) => JSX.Element;
  displayCount?: number;
  maxOverflow?: number;
}

export const getRowItemsWithActions = ({
  values,
  fieldName,
  idPrefix,
  render,
  displayCount = 5,
  maxOverflow = 5,
}: GetRowItemsWithActionsParams): JSX.Element => {
  if (values != null && values.length > 0) {
    const visibleItems = values.slice(0, displayCount).map((value, index) => {
      const id = escapeDataProviderId(`${idPrefix}-${fieldName}-${value}-${index}`);
      return (
        <SecurityCellActions
          key={id}
          mode={CellActionsMode.HOVER_DOWN}
          visibleCellActions={5}
          showActionTooltips
          triggerId={SecurityCellActionsTrigger.DEFAULT}
          data={{
            value,
            field: fieldName,
          }}
        >
          <>{render ? render(value) : defaultToEmptyTag(value)}</>
        </SecurityCellActions>
      );
    });

    return visibleItems.length > 0 ? (
      <>
        {visibleItems}{' '}
        <RowItemOverflow
          fieldName={fieldName}
          values={values}
          idPrefix={idPrefix}
          overflowIndexStart={displayCount}
          maxOverflowItems={maxOverflow}
        />
      </>
    ) : (
      getEmptyTagValue()
    );
  } else {
    return getEmptyTagValue();
  }
};

interface RowItemOverflowProps {
  fieldName: string;
  values: string[];
  idPrefix: string;
  overflowIndexStart: number;
  maxOverflowItems: number;
}

export const RowItemOverflowComponent: React.FC<RowItemOverflowProps> = ({
  fieldName,
  values,
  idPrefix,
  overflowIndexStart = 5,
  maxOverflowItems = 5,
}) => {
  const maxVisibleValues = useMemo(
    () => values.slice(0, maxOverflowItems + 1),
    [values, maxOverflowItems]
  );
  return (
    <>
      {values.length > overflowIndexStart && (
        <Popover count={values.length - overflowIndexStart} idPrefix={idPrefix}>
          <EuiText size="xs">
            <MoreContainer
              fieldName={fieldName}
              idPrefix={idPrefix}
              values={maxVisibleValues}
              overflowIndexStart={overflowIndexStart}
              moreMaxHeight="none"
            />
          </EuiText>
          {values.length > overflowIndexStart + maxOverflowItems && (
            <EuiFlexGroup
              css={{ paddingTop: euiThemeVars.euiSizeM }}
              data-test-subj="popover-additional-overflow"
            >
              <EuiFlexItem>
                <EuiText size="xs">
                  <EuiTextColor color="subdued">
                    {values.length - overflowIndexStart - maxOverflowItems}{' '}
                    <FormattedMessage
                      data-test-subj="popover-additional-overflow-text"
                      id="xpack.securitySolution.tables.rowItemHelper.moreDescription"
                      defaultMessage="more not shown"
                    />
                  </EuiTextColor>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </Popover>
      )}
    </>
  );
};
RowItemOverflowComponent.displayName = 'RowItemOverflowComponent';
export const RowItemOverflow = React.memo(RowItemOverflowComponent);

interface PopoverComponentProps {
  children: React.ReactNode;
  count: number;
  idPrefix: string;
}

const PopoverComponent: React.FC<PopoverComponentProps> = ({ children, count, idPrefix }) => {
  const [isOpen, setIsOpen] = useState(false);
  const onButtonClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  return (
    <Subtext>
      <EuiPopover
        button={
          <EuiLink onClick={onButtonClick} data-test-subj="overflow-button">
            <FormattedMessage
              id="xpack.securitySolution.tables.rowItemHelper.overflowButtonDescription"
              defaultMessage="+{count} More"
              values={{ count }}
            />
          </EuiLink>
        }
        closePopover={() => setIsOpen(!isOpen)}
        id={`${idPrefix}-popover`}
        isOpen={isOpen}
        panelClassName="withHoverActions__popover"
        repositionOnScroll
      >
        {children}
      </EuiPopover>
    </Subtext>
  );
};

PopoverComponent.displayName = 'PopoverComponent';

export const Popover = React.memo(PopoverComponent);

Popover.displayName = 'Popover';

export const OverflowFieldComponent = ({
  value,
  showToolTip = true,
  overflowLength = 50,
}: {
  value: string;
  showToolTip?: boolean;
  overflowLength?: number;
}) => (
  <span>
    {showToolTip ? (
      <EuiToolTip data-test-subj={'message-tooltip'} content={'message'}>
        <>{value.substring(0, overflowLength)}</>
      </EuiToolTip>
    ) : (
      <>{value.substring(0, overflowLength)}</>
    )}
    {value.length > overflowLength && (
      <EuiToolTip content={value}>
        <MoreRowItems type="boxesHorizontal" />
      </EuiToolTip>
    )}
  </span>
);

OverflowFieldComponent.displayName = 'OverflowFieldComponent';

export const OverflowField = React.memo(OverflowFieldComponent);

OverflowField.displayName = 'OverflowField';
