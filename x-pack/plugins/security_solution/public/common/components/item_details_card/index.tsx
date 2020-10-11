/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, isValidElement, memo, ReactElement, ReactNode, useMemo } from 'react';
import styled from 'styled-components';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiButtonProps,
  PropsForButton,
} from '@elastic/eui';

const OTHER_NODES = {};

const groupChildrenByType = (
  children: ReactNode | ReactNode[],
  types: Array<ReactElement['type']>
) => {
  const result = new Map<ReactElement['type'] | typeof OTHER_NODES, ReactNode[]>();

  types.forEach((type) => result.set(type, []));
  result.set(OTHER_NODES, []);

  React.Children.toArray(children).forEach((child) => {
    const key = isValidElement(child) ? child.type : OTHER_NODES;

    if (!result.has(key)) {
      result.get(OTHER_NODES)?.push(child);
    } else {
      result.get(key)?.push(child);
    }
  });

  return result;
};

const SummarySection = styled(EuiFlexItem)`
  background-color: ${({ theme }) => theme.eui.euiColorLightestShade};
  padding: ${({ theme }) => theme.eui.euiSize};
`;

const DetailsSection = styled(EuiFlexItem)`
  padding: ${({ theme }) => theme.eui.euiSize};
`;

const DescriptionListTitle = styled(EuiDescriptionListTitle)`
  &&& {
    width: 40%;
  }
`;

const DescriptionListDescription = styled(EuiDescriptionListDescription)`
  &&& {
    width: 60%;
  }
`;

interface ItemDetailsPropertySummaryProps {
  name: ReactNode | ReactNode[];
  value: ReactNode | ReactNode[];
  title?: string;
}

export const ItemDetailsPropertySummary: FC<ItemDetailsPropertySummaryProps> = memo(
  ({ name, value, title = '' }) => (
    <>
      <DescriptionListTitle>{name}</DescriptionListTitle>
      <DescriptionListDescription>
        <span title={title}>{value}</span>
      </DescriptionListDescription>
    </>
  )
);

ItemDetailsPropertySummary.displayName = 'ItemPropertySummary';

export const ItemDetailsAction: FC<PropsForButton<EuiButtonProps>> = memo(
  ({ children, ...rest }) => (
    <EuiFlexGroup direction="column" alignItems="flexEnd" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiButton {...rest}>{children}</EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);

ItemDetailsAction.displayName = 'ItemDetailsAction';

export const ItemDetailsCard: FC = memo(({ children }) => {
  const childElements = useMemo(
    () => groupChildrenByType(children, [ItemDetailsPropertySummary, ItemDetailsAction]),
    [children]
  );

  return (
    <EuiPanel paddingSize="none">
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiFlexGroup direction="row">
            <SummarySection grow={2}>
              <EuiDescriptionList compressed type="column">
                {childElements.get(ItemDetailsPropertySummary)}
              </EuiDescriptionList>
            </SummarySection>
            <DetailsSection grow={5}>
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem grow={false}>{childElements.get(OTHER_NODES)}</EuiFlexItem>
                {childElements.has(ItemDetailsAction) && (
                  <EuiFlexItem grow={1}>
                    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
                      {childElements.get(ItemDetailsAction)?.map((action, index) => (
                        <EuiFlexItem grow={false} key={index}>
                          {action}
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </DetailsSection>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});

ItemDetailsCard.displayName = 'ItemDetailsCard';
