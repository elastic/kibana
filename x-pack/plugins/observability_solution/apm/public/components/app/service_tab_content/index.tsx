/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReactNode } from 'react-markdown';
import { EuiSpacer } from '@elastic/eui';
import { SignalTypes } from '../../../../common/entities/types';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { isApmSignal, isLogsSignal } from '../../../utils/get_signal_type';
import { useLocalStorage } from '../../../hooks/use_local_storage';
import { emptyStateContent } from './constants';
import { Tab } from './types';
import { ServiceTabEmptyState } from '../service_tab_empty_state';
import { SearchBar } from '../../shared/search_bar/search_bar';

export interface ServiceTabContentProps {
  tabName: Tab;
  children: ReactNode;
}

export function ServiceTabContent({ children, tabName }: ServiceTabContentProps) {
  const { serviceEntitySummary } = useApmServiceContext();

  const hasOnlyLogsSignal =
    serviceEntitySummary?.signalTypes &&
    !isApmSignal(serviceEntitySummary.signalTypes as SignalTypes[]) &&
    isLogsSignal(serviceEntitySummary.signalTypes as SignalTypes[]);

  const [dismissedLogsOnlyEmptyState, setdismissedLogsOnlyEmptyState] = useLocalStorage(
    `apm.dismissedLogsOnlyEmptyState.${tabName}`,
    false
  );

  const displayEmptyStateOnly = tabName !== 'overview';
  const displaySearchBar = tabName === 'service-map';

  return (
    <>
      {hasOnlyLogsSignal ? (
        <>
          {displayEmptyStateOnly ? (
            <>
              {displaySearchBar && <SearchBar showTimeComparison={true} />}
              <ServiceTabEmptyState
                title={emptyStateContent[tabName].title}
                content={emptyStateContent[tabName].content}
                imgSrc={emptyStateContent[tabName].imgSrc ?? null}
              />
            </>
          ) : (
            <>
              {!dismissedLogsOnlyEmptyState && (
                <ServiceTabEmptyState
                  title={emptyStateContent[tabName].title}
                  content={emptyStateContent[tabName].content}
                  imgSrc={emptyStateContent[tabName].imgSrc ?? null}
                  dismissable={true}
                  onDissmiss={() => setdismissedLogsOnlyEmptyState(true)}
                />
              )}
              <EuiSpacer size="m" />

              {children}
            </>
          )}
        </>
      ) : (
        <>{children}</>
      )}
    </>
  );
}
