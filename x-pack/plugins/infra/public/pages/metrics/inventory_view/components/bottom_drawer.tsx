/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

import { euiStyled, useUiTracker } from '../../../../../../observability/public';
import { InfraFormatter } from '../../../../lib/lib';
import { Timeline } from './timeline/timeline';

const showHistory = i18n.translate('xpack.infra.showHistory', {
  defaultMessage: 'Show history',
});
const hideHistory = i18n.translate('xpack.infra.hideHistory', {
  defaultMessage: 'Hide history',
});

const TRANSITION_MS = 300;

export const BottomDrawer: React.FC<{
  measureRef: (instance: HTMLElement | null) => void;
  interval: string;
  formatter: InfraFormatter;
}> = ({ measureRef, interval, formatter, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const trackDrawerOpen = useUiTracker({ app: 'infra_metrics' });
  const onClick = useCallback(() => {
    if (!isOpen) trackDrawerOpen({ metric: 'open_timeline_drawer__inventory' });
    setIsOpen(!isOpen);
  }, [isOpen, trackDrawerOpen]);

  return (
    <BottomActionContainer ref={isOpen ? measureRef : null} isOpen={isOpen}>
      <BottomActionTopBar ref={isOpen ? null : measureRef}>
        <EuiFlexItem grow={false}>
          <ShowHideButton
            aria-expanded={isOpen}
            iconType={isOpen ? 'arrowDown' : 'arrowRight'}
            onClick={onClick}
          >
            {isOpen ? hideHistory : showHistory}
          </ShowHideButton>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          style={{
            position: 'relative',
            minWidth: 400,
            height: '16px',
          }}
        >
          {children}
        </EuiFlexItem>
        <RightSideSpacer />
      </BottomActionTopBar>
      <EuiFlexGroup style={{ marginTop: 0 }}>
        <Timeline isVisible={isOpen} interval={interval} yAxisFormatter={formatter} />
      </EuiFlexGroup>
    </BottomActionContainer>
  );
};

const BottomActionContainer = euiStyled.div<{ isOpen: boolean }>`
  padding: ${(props) => props.theme.eui.paddingSizes.m} 0;
  position: fixed;
  left: 0;
  bottom: 0;
  right: 0;
  transition: transform ${TRANSITION_MS}ms;
  transform: translateY(${(props) => (props.isOpen ? 0 : '224px')})
`;

const BottomActionTopBar = euiStyled(EuiFlexGroup).attrs({
  justifyContent: 'spaceBetween',
  alignItems: 'center',
})`
 margin-bottom: 0;
 height: 48px;
`;

const ShowHideButton = euiStyled(EuiButtonEmpty).attrs({ size: 's' })`
  width: 140px;
`;

const RightSideSpacer = euiStyled(EuiSpacer).attrs({ size: 'xs' })`
  width: 140px;
`;
