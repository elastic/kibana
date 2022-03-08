/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { useUiTracker } from '../../../../../../observability/public';
import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
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
  width: number;
}> = ({ measureRef, width, interval, formatter, children }) => {
  const { timelineOpen, changeTimelineOpen } = useWaffleOptionsContext();

  const [isOpen, setIsOpen] = useState(Boolean(timelineOpen));

  useEffect(() => {
    if (isOpen !== timelineOpen) setIsOpen(Boolean(timelineOpen));
  }, [isOpen, timelineOpen]);

  const trackDrawerOpen = useUiTracker({ app: 'infra_metrics' });
  const onClick = useCallback(() => {
    if (!isOpen) trackDrawerOpen({ metric: 'open_timeline_drawer__inventory' });
    setIsOpen(!isOpen);
    changeTimelineOpen(!isOpen);
  }, [isOpen, trackDrawerOpen, changeTimelineOpen]);

  return (
    <BottomActionContainer ref={isOpen ? measureRef : null} isOpen={isOpen} outerWidth={width}>
      <BottomActionTopBar ref={isOpen ? null : measureRef}>
        <EuiFlexItem grow={false}>
          <ShowHideButton
            aria-expanded={isOpen}
            iconType={isOpen ? 'arrowDown' : 'arrowRight'}
            onClick={onClick}
            data-test-subj="toggleTimelineButton"
          >
            {isOpen ? hideHistory : showHistory}
          </ShowHideButton>
        </EuiFlexItem>
      </BottomActionTopBar>
      <EuiFlexGroup style={{ marginTop: 0 }}>
        <Timeline isVisible={isOpen} interval={interval} yAxisFormatter={formatter} />
      </EuiFlexGroup>
    </BottomActionContainer>
  );
};

const BottomActionContainer = euiStyled.div<{ isOpen: boolean; outerWidth: number }>`
  padding: ${(props) => props.theme.eui.paddingSizes.m} 0;
  position: fixed;
  bottom: 0;
  right: 0;
  transition: transform ${TRANSITION_MS}ms;
  transform: translateY(${(props) => (props.isOpen ? 0 : '224px')});
  width: ${(props) => props.outerWidth + 34}px;
`; // Additional width comes from the padding on the EuiPageBody and inner nodes container

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
