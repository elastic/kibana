/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useCallback } from 'react';
import { CommonProps, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { CardExpandButton } from './card_expand_button';
import { TextValueDisplay } from './text_value_display';
import { EffectScope } from './effect_scope';
import { CardActionsFlexItem } from './card_actions_flex_item';
import { ArtifactInfo } from '../types';
import { ArtifactEntryCollapsableCardProps } from '../artifact_entry_collapsable_card';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { useCollapsedCssClassNames } from '../hooks/use_collapsed_css_class_names';
import { usePolicyNavLinks } from '../hooks/use_policy_nav_links';

export interface CardCompressedHeaderProps
  extends Pick<CommonProps, 'data-test-subj'>,
    Pick<
      ArtifactEntryCollapsableCardProps,
      'onExpandCollapse' | 'expanded' | 'actions' | 'policies'
    > {
  artifact: ArtifactInfo;
}

export const CardCompressedHeader = memo<CardCompressedHeaderProps>(
  ({
    artifact,
    onExpandCollapse,
    policies,
    actions,
    expanded = false,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const cssClassNames = useCollapsedCssClassNames(expanded);
    const policyNavLinks = usePolicyNavLinks(artifact, policies);

    const handleExpandCollapseClick = useCallback(() => {
      onExpandCollapse();
    }, [onExpandCollapse]);

    return (
      <EuiFlexGroup responsive={false} alignItems="center" data-test-subj={dataTestSubj}>
        <EuiFlexItem grow={false}>
          <CardExpandButton
            expanded={expanded}
            onClick={handleExpandCollapseClick}
            data-test-subj={getTestId('expandCollapse')}
          />
        </EuiFlexItem>
        <EuiFlexItem className={cssClassNames}>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={2} className={cssClassNames} data-test-subj={getTestId('title')}>
              <TextValueDisplay bold truncate={!expanded}>
                {artifact.name}
              </TextValueDisplay>
            </EuiFlexItem>
            <EuiFlexItem
              grow={3}
              className={cssClassNames}
              data-test-subj={getTestId('description')}
            >
              <TextValueDisplay truncate={!expanded}>{artifact.description}</TextValueDisplay>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EffectScope policies={policyNavLinks} data-test-subj={getTestId('effectScope')} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <CardActionsFlexItem actions={actions} data-test-subj={getTestId('actions')} />
      </EuiFlexGroup>
    );
  }
);
CardCompressedHeader.displayName = 'CardCompressedHeader';

const ButtonIconPlaceHolder = styled.div`
  display: inline-block;
  width: 24px;
  height: 24px;
`;

/**
 * Layout used for the compressed card header. Used also in the ArtifactGrid for creating the grid header row
 */
export interface CardCompressedHeaderLayoutProps extends Pick<CommonProps, 'data-test-subj'> {
  expanded: boolean;
  expandToggle: ReactNode;
  name: ReactNode;
  description: ReactNode;
  effectScope: ReactNode;
  /** If no menu is shown, but you want the space for it be preserved, set prop to `false` */
  actionMenu?: ReactNode | false;
}

export const CardCompressedHeaderLayout = memo<CardCompressedHeaderLayoutProps>(
  ({
    expanded,
    name,
    expandToggle,
    effectScope,
    actionMenu,
    description,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const cssClassNames = useCollapsedCssClassNames(expanded);

    return (
      <EuiFlexGroup responsive={false} alignItems="center" data-test-subj={dataTestSubj}>
        <EuiFlexItem grow={false}>{expandToggle}</EuiFlexItem>
        <EuiFlexItem className={cssClassNames}>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={2} className={cssClassNames} data-test-subj={getTestId('title')}>
              {name}
            </EuiFlexItem>
            <EuiFlexItem
              grow={3}
              className={cssClassNames}
              data-test-subj={getTestId('description')}
            >
              {description}
            </EuiFlexItem>
            <EuiFlexItem grow={1}>{effectScope}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {actionMenu === false ? (
          <EuiFlexItem grow={false}>
            <ButtonIconPlaceHolder />
          </EuiFlexItem>
        ) : (
          actionMenu
        )}
      </EuiFlexGroup>
    );
  }
);
CardCompressedHeaderLayout.displayName = 'CardCompressedHeaderLayout';
