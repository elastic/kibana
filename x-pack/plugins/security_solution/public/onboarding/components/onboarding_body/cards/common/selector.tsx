/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiPanel,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiBackgroundColor,
  EuiTitle,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

export interface SelectorItem {
  id: string;
  title: string;
  description: string;
  asset: {
    type: 'video' | 'image';
    source: string;
    alt: string;
  };
}

interface SelectorProps {
  items: SelectorItem[];
  onSelect: (item: SelectorItem) => void;
  selectedItem: SelectorItem;
  title?: string;
}

export const Selector = React.memo<SelectorProps>(({ items, onSelect, selectedItem, title }) => {
  const { euiTheme } = useEuiTheme();
  const itemBackgroundColor = useEuiBackgroundColor('primary');

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {title && (
        <EuiFlexItem>
          <EuiText data-test-subj="rulesCardDescription" size="xs" style={{ fontWeight: 500 }}>
            {title}
          </EuiText>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiFlexGroup
          style={{ maxHeight: '210px', overflowY: 'auto', padding: '10px 0' }}
          direction="column"
          gutterSize="s"
        >
          {items.map((item) => (
            <EuiFlexItem grow={false}>
              <EuiPanel
                hasBorder
                style={
                  selectedItem.id === item.id
                    ? {
                        border: `1px solid ${euiTheme.colors.primary}`,
                        backgroundColor: `${itemBackgroundColor}`,
                      }
                    : {}
                }
                color={selectedItem.id === item.id ? 'subdued' : 'plain'}
                element="button"
                onClick={() => {
                  onSelect(item);
                }}
              >
                <EuiTitle data-test-subj="rulesCardDescription" size="xxs">
                  <h5>{item.title}</h5>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiText data-test-subj="rulesCardDescription" size="xs">
                  {item.description}
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
Selector.displayName = 'Selector';
