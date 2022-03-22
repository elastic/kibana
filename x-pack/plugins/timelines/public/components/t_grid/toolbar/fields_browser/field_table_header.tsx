/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import {
  EuiText,
  EuiPopover,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHorizontalRule,
} from '@elastic/eui';
import * as i18n from './translations';

export interface FieldTableHeaderProps {
  fieldCount: number;
  filterSelectedEnabled: boolean;
  onFilterSelectedChange: (enabled: boolean) => void;
}

const Count = styled.span`
  font-weight: bold;
`;
Count.displayName = 'Count';

const FieldTableHeaderComponent: React.FC<FieldTableHeaderProps> = ({
  fieldCount,
  filterSelectedEnabled,
  onFilterSelectedChange,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiText data-test-subj="fields-showing" size="xs">
          {i18n.FIELDS_SHOWING}
          <Count data-test-subj="fields-count"> {fieldCount} </Count>
          {i18n.FIELDS_COUNT(fieldCount)}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          panelPaddingSize="none"
          anchorPosition="downRight"
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          button={
            <EuiButtonEmpty
              data-test-subj="viewSelectorButton"
              size="xs"
              iconType="arrowDown"
              iconSide="right"
              onClick={togglePopover}
            >
              {`${i18n.VIEW_LABEL}: ${
                filterSelectedEnabled ? i18n.VIEW_VALUE_SELECTED : i18n.VIEW_VALUE_ALL
              }`}
            </EuiButtonEmpty>
          }
        >
          <EuiContextMenuPanel
            data-test-subj="viewSelectorMenu"
            size="s"
            items={[
              <EuiContextMenuItem
                data-test-subj="viewSelectorOption-all"
                key="viewAll"
                icon={filterSelectedEnabled ? 'empty' : 'check'}
                onClick={() => {
                  onFilterSelectedChange(false);
                  closePopover();
                }}
              >
                {`${i18n.VIEW_LABEL} ${i18n.VIEW_VALUE_ALL}`}
              </EuiContextMenuItem>,
              <EuiHorizontalRule key="separator" margin="none" />,
              <EuiContextMenuItem
                data-test-subj="viewSelectorOption-selected"
                key="viewSelected"
                icon={filterSelectedEnabled ? 'check' : 'empty'}
                onClick={() => {
                  onFilterSelectedChange(true);
                  closePopover();
                }}
              >
                {`${i18n.VIEW_LABEL} ${i18n.VIEW_VALUE_SELECTED}`}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const FieldTableHeader = React.memo(FieldTableHeaderComponent);
