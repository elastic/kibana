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

import { DragEffects, DraggableWrapper } from '../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue } from '../empty_value';
import { MoreRowItems } from '../page';
import { IS_OPERATOR } from '../../../timelines/components/timeline/data_providers/data_provider';
import { Provider } from '../../../timelines/components/timeline/data_providers/provider';

import { MoreContainer } from '../../../timelines/components/field_renderers/field_renderers';

const Subtext = styled.div`
  font-size: ${(props) => props.theme.eui.euiFontSizeXS};
`;

interface GetRowItemDraggableParams {
  rowItem: string | null | undefined;
  attrName: string;
  idPrefix: string;
  render?: (item: string) => JSX.Element;
  fieldType?: string;
  isAggregatable?: boolean;
  displayCount?: number;
  dragDisplayValue?: string;
  maxOverflow?: number;
}

export const getRowItemDraggable = ({
  rowItem,
  attrName,
  idPrefix,
  fieldType,
  isAggregatable,
  render,
  dragDisplayValue,
}: GetRowItemDraggableParams): JSX.Element => {
  if (rowItem != null) {
    const id = escapeDataProviderId(`${idPrefix}-${attrName}-${rowItem}`);
    return (
      <DraggableWrapper
        key={id}
        dataProvider={{
          and: [],
          enabled: true,
          id,
          name: rowItem,
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field: attrName,
            value: rowItem,
            displayValue: dragDisplayValue || rowItem,
            operator: IS_OPERATOR,
          },
        }}
        fieldType={fieldType}
        isAggregatable={isAggregatable}
        render={(dataProvider, _, snapshot) =>
          snapshot.isDragging ? (
            <DragEffects>
              <Provider dataProvider={dataProvider} />
            </DragEffects>
          ) : (
            <>{render ? render(rowItem) : defaultToEmptyTag(rowItem)}</>
          )
        }
      />
    );
  } else {
    return getEmptyTagValue();
  }
};

interface GetRowItemDraggablesParams {
  rowItems: string[] | null | undefined;
  attrName: string;
  idPrefix: string;
  render?: (item: string) => JSX.Element;
  fieldType?: string;
  isAggregatable?: boolean;
  displayCount?: number;
  dragDisplayValue?: string;
  maxOverflow?: number;
}
export const getRowItemDraggables = ({
  rowItems,
  attrName,
  idPrefix,
  render,
  dragDisplayValue,
  fieldType = 'keyword',
  isAggregatable = false,
  displayCount = 5,
  maxOverflow = 5,
}: GetRowItemDraggablesParams): JSX.Element => {
  if (rowItems != null && rowItems.length > 0) {
    const draggables = rowItems.slice(0, displayCount).map((rowItem, index) => {
      const id = escapeDataProviderId(`${idPrefix}-${attrName}-${rowItem}-${index}`);
      return (
        <React.Fragment key={id}>
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: rowItem,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: attrName,
                value: rowItem,
                displayValue: dragDisplayValue || rowItem,
                operator: IS_OPERATOR,
              },
            }}
            fieldType={fieldType}
            isAggregatable={isAggregatable}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <>{render ? render(rowItem) : defaultToEmptyTag(rowItem)}</>
              )
            }
          />
        </React.Fragment>
      );
    });

    return draggables.length > 0 ? (
      <>
        {draggables}{' '}
        <RowItemOverflow
          attrName={attrName}
          dragDisplayValue={dragDisplayValue}
          idPrefix={idPrefix}
          maxOverflowItems={maxOverflow}
          overflowIndexStart={displayCount}
          rowItems={rowItems}
          fieldType={fieldType}
          isAggregatable={isAggregatable}
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
  attrName: string;
  dragDisplayValue?: string;
  idPrefix: string;
  maxOverflowItems: number;
  overflowIndexStart: number;
  rowItems: string[];
  fieldType?: string;
  isAggregatable?: boolean;
}

export const RowItemOverflowComponent: React.FC<RowItemOverflowProps> = ({
  attrName,
  dragDisplayValue,
  idPrefix,
  maxOverflowItems = 5,
  overflowIndexStart = 5,
  rowItems,
  fieldType,
  isAggregatable,
}) => {
  return (
    <>
      {rowItems.length > overflowIndexStart && (
        <Popover count={rowItems.length - overflowIndexStart} idPrefix={idPrefix}>
          <EuiText size="xs">
            <MoreContainer
              attrName={attrName}
              dragDisplayValue={dragDisplayValue}
              idPrefix={idPrefix}
              overflowIndexStart={overflowIndexStart}
              rowItems={rowItems}
              moreMaxHeight="none"
              fieldType={fieldType}
              isAggregatable={isAggregatable}
            />

            {rowItems.length > overflowIndexStart + maxOverflowItems && (
              <p data-test-subj="popover-additional-overflow">
                <EuiTextColor color="subdued">
                  {rowItems.length - overflowIndexStart - maxOverflowItems}{' '}
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
