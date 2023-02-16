/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiPanel } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useUiTracker } from '@kbn/observability-plugin/public';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { InventoryItemType } from '../../../../../common/inventory_models/types';
import { TryItButton } from '../../../../components/try_it_button';
import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
import { InfraFormatter } from '../../../../lib/lib';
import { Timeline } from './timeline/timeline';

const showHistory = i18n.translate('xpack.infra.showHistory', {
  defaultMessage: 'Show history',
});
const hideHistory = i18n.translate('xpack.infra.hideHistory', {
  defaultMessage: 'Hide history',
});

interface Props {
  interval: string;
  formatter: InfraFormatter;
  view: string;
  nodeType: InventoryItemType;
}

const LOCAL_STORAGE_KEY = 'inventoryUI:k8sDashboardClicked';
const KubernetesButton = () => {
  const [clicked, setClicked] = useLocalStorage<boolean>(LOCAL_STORAGE_KEY, false);
  const clickedRef = useRef<boolean | undefined>(clicked);
  return (
    <TryItButton
      color={clickedRef.current ? 'primary' : 'accent'}
      label={i18n.translate('xpack.infra.bottomDrawer.kubernetesDashboardsLink', {
        defaultMessage: 'Kubernetes dashboards',
      })}
      data-test-subj="inventory-kubernetesDashboard-link"
      link={{
        app: 'dashboards',
        hash: '/list',
        search: {
          _g: '()',
          s: 'kubernetes tag:(Managed)',
        },
      }}
      onClick={() => {
        if (!clickedRef.current) {
          setClicked(true);
        }
      }}
      hideBadge={clickedRef.current}
    />
  );
};
export const BottomDrawer = ({ interval, formatter, view, nodeType }: Props) => {
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

  if (view === 'table') {
    return nodeType === 'pod' ? (
      <BottomPanel hasBorder={false} hasShadow={false} borderRadius="none" paddingSize="s">
        <KubernetesButton />
      </BottomPanel>
    ) : null;
  }

  return (
    <BottomActionContainer>
      <StickyPanel borderRadius="none" paddingSize="s">
        <EuiFlexGroup responsive={false} justifyContent="flexStart" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-expanded={isOpen}
              iconType={isOpen ? 'arrowDown' : 'arrowRight'}
              onClick={onClick}
              data-test-subj="toggleTimelineButton"
            >
              {isOpen ? hideHistory : showHistory}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {nodeType === 'pod' && (
            <EuiFlexItem grow={false}>
              <KubernetesButton />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </StickyPanel>
      <EuiFlexGroup
        style={{
          maxHeight: isOpen ? '224px' : 0,
          transition: 'max-height 0.15s ease',
          overflow: 'hidden',
        }}
      >
        <Timeline isVisible={isOpen} interval={interval} yAxisFormatter={formatter} />
      </EuiFlexGroup>
    </BottomActionContainer>
  );
};

const BottomActionContainer = euiStyled.div`
  position: sticky;
  bottom: 0;
  left: 0;
  background: ${(props) => props.theme.eui.euiColorGhost};
  width: calc(100% + ${(props) => props.theme.eui.euiSizeL} * 2);
  margin-left: -${(props) => props.theme.eui.euiSizeL};
`; // Additional width comes from the padding on the EuiPageBody and inner nodes container

const BottomPanel = euiStyled(EuiPanel)`
  padding: ${(props) => props.theme.eui.euiSizeL} 0;
`;

const StickyPanel = euiStyled(EuiPanel)`
  padding: 0 ${(props) => props.theme.eui.euiSizeL};
`;
