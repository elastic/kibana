/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiPopover, EuiToolTip, EuiText, EuiTextColor } from '@elastic/eui';
import styled from 'styled-components';
import { CellActions, CellActionsMode } from '@kbn/cell-actions';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue } from '../empty_value';
import { MoreRowItems } from '../page';
import { CELL_ACTIONS_DEFAULT_TRIGGER } from '../../../../common/constants';
import { MoreContainer } from '../../../timelines/components/field_renderers/field_renderers';

const Subtext = styled.div`
  font-size: ${(props) => props.theme.eui.euiFontSizeXS};
`;

interface GetRowItemsWithActionsParams {
  values: string[] | null | undefined;
  fieldName: string;
  fieldType?: string;
  idPrefix: string;
  render?: (item: string) => JSX.Element;
  displayCount?: number;
  maxOverflow?: number;
}

export const getRowItemsWithActions = ({
  values,
  fieldName,
  fieldType = 'keyword',
  idPrefix,
  render,
  displayCount = 5,
  maxOverflow = 5,
}: GetRowItemsWithActionsParams): JSX.Element => {
  if (values != null && values.length > 0) {
    const visibleItems = values.slice(0, displayCount).map((value, index) => {
      const id = escapeDataProviderId(`${idPrefix}-${fieldName}-${value}-${index}`);
      return (
        <CellActions
          key={id}
          mode={CellActionsMode.HOVER}
          visibleCellActions={5}
          showActionTooltips
          triggerId={CELL_ACTIONS_DEFAULT_TRIGGER}
          field={{
            name: fieldName,
            value,
            type: fieldType,
          }}
        >
          <>{render ? render(value) : defaultToEmptyTag(value)}</>
        </CellActions>
      );
    });

    return visibleItems.length > 0 ? (
      <>
        {visibleItems}{' '}
        <RowItemOverflow
          fieldName={fieldName}
          values={values}
          fieldType={fieldType}
          idPrefix={idPrefix}
          maxOverflowItems={maxOverflow}
          overflowIndexStart={displayCount}
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
  fieldType: string;
  values: string[];
  idPrefix: string;
  maxOverflowItems: number;
  overflowIndexStart: number;
}

export const RowItemOverflowComponent: React.FC<RowItemOverflowProps> = ({
  fieldName,
  values,
  fieldType,
  idPrefix,
  maxOverflowItems = 5,
  overflowIndexStart = 5,
}) => {
  return (
    <>
      {values.length > overflowIndexStart && (
        <Popover count={values.length - overflowIndexStart} idPrefix={idPrefix}>
          <EuiText size="xs">
            <MoreContainer
              fieldName={fieldName}
              idPrefix={idPrefix}
              fieldType={fieldType}
              values={values}
              overflowIndexStart={overflowIndexStart}
              moreMaxHeight="none"
            />

            {values.length > overflowIndexStart + maxOverflowItems && (
              <p data-test-subj="popover-additional-overflow">
                <EuiTextColor color="subdued">
                  {values.length - overflowIndexStart - maxOverflowItems}{' '}
                  <FormattedMessage
                    id="xpack.securitySolution.tables.rowItemHelper.moreDescription"
                    defaultMessage="more not shown"
                  />
                </EuiTextColor>
              </p>
            )}
          </EuiText>
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
