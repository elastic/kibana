/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';
import { FETCH_STATUS, useFetcher } from '../../../../../../observability/public';
import { triggerNowMonitor } from '../../../../state/api';
import { MonitorSummary } from '../../../../../common/runtime_types';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';

export const ActionsPopover = ({ item }: { item: MonitorSummary }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>();
  const [triggerRun, setTriggerRun] = useState<boolean>(false);

  const { notifications } = useKibana().services;

  const closePopover = () => {
    setIsPopoverOpen(false);
  };
  const togglePopover = () => {
    setIsPopoverOpen(true);
  };

  const { data, loading, status } = useFetcher(() => {
    if (item && triggerRun && item.config_id) {
      return triggerNowMonitor({
        id: item.config_id,
      });
    }
    return () => {
      setTriggerRun(false);
    };
  }, [item.config_id, triggerRun]);

  useEffect(() => {
    if (data && status === FETCH_STATUS.SUCCESS && !loading) {
      notifications?.toasts.addSuccess('Successfully triggered monitor.');
    }
  }, [data, loading, notifications?.toasts, status]);

  if (loading) {
    return <EuiLoadingSpinner size="s" />;
  }

  return (
    <EuiPopover
      id={`monitor-list-actions`}
      button={
        <EuiButtonIcon
          aria-label="Actions"
          iconType="boxesVertical"
          size="s"
          color="text"
          onClick={() => togglePopover()}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => closePopover()}
      panelPaddingSize="none"
      anchorPosition="leftCenter"
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="A"
            onClick={() => {
              closePopover();
              setTriggerRun(true);
            }}
          >
            Trigger now
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
