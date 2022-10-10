/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren, ReactElement, ReactNode } from 'react';
import React, { isValidElement, memo, useMemo } from 'react';
import styled from 'styled-components';
import type { EuiButtonProps, PropsForButton } from '@elastic/eui';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
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
  &&& {
    margin-left: 0;
  }
  padding: ${({ theme }) => theme.eui.euiSizeM} ${({ theme }) => theme.eui.euiSizeL}
    ${({ theme }) => theme.eui.euiSizeL} 0;
  .trustedAppsConditionsTable {
    margin-left: ${({ theme }) => theme.eui.euiSize};
  }
`;

const DescriptionListTitle = styled(EuiDescriptionListTitle)`
  &&& {
    width: 40%;
    margin-top: 0;
    margin-bottom: ${({ theme }) => theme.eui.euiSizeS};
  }
`;

const DescriptionListDescription = styled(EuiDescriptionListDescription)`
  &&& {
    width: 60%;
    margin-top: 0;
    margin-bottom: ${({ theme }) => theme.eui.euiSizeS};
  }
`;

interface ItemDetailsPropertySummaryProps {
  name: ReactNode | ReactNode[];
  value: ReactNode | ReactNode[];
}

export const ItemDetailsPropertySummary = memo<ItemDetailsPropertySummaryProps>(
  ({ name, value }) => (
    <>
      <DescriptionListTitle className="eui-textTruncate">{name}</DescriptionListTitle>
      <DescriptionListDescription className="eui-textBreakWord">{value}</DescriptionListDescription>
    </>
  )
);

ItemDetailsPropertySummary.displayName = 'ItemPropertySummary';

export const ItemDetailsAction: FC<PropsForButton<EuiButtonProps>> = memo(
  ({ children, className = '', ...rest }) => (
    <div>
      <EuiButton className={`eui-fullWidth ${className}`} {...rest}>
        {children}
      </EuiButton>
    </div>
  )
);

ItemDetailsAction.displayName = 'ItemDetailsAction';

export type ItemDetailsCardProps = PropsWithChildren<{
  'data-test-subj'?: string;
  className?: string;
}>;
export const ItemDetailsCard = memo<ItemDetailsCardProps>(
  ({ children, 'data-test-subj': dataTestSubj, className }) => {
    const childElements = useMemo(
      () => groupChildrenByType(children, [ItemDetailsPropertySummary, ItemDetailsAction]),
      [children]
    );

    return (
      <EuiPanel paddingSize="none" data-test-subj={dataTestSubj} className={className} hasBorder>
        <EuiFlexGroup direction="row">
          <SummarySection grow={2}>
            <EuiDescriptionList compressed type="column">
              {childElements.get(ItemDetailsPropertySummary)}
            </EuiDescriptionList>
          </SummarySection>
          <DetailsSection grow={5}>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem grow={1}>
                <div>{childElements.get(OTHER_NODES)}</div>
              </EuiFlexItem>
              {childElements.has(ItemDetailsAction) && (
                <EuiFlexItem grow={false}>
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
      </EuiPanel>
    );
  }
);

ItemDetailsCard.displayName = 'ItemDetailsCard';
