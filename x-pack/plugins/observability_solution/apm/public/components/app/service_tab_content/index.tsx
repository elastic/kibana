/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReactNode } from 'react-markdown';
import { Tab } from './types';

interface ServiceTabContentProps {
  tabName: Tab;
  children: ReactNode;
}

export function ServiceTabContent({ children, tabName }: ServiceTabContentProps) {
  // commented/blocked until PR #191183 is merged

  // const { serviceEntitySummary } = useApmServiceContext();

  // const hasOnlyLogsSignal =
  //   serviceEntitySummary?.signalTypes &&
  //   !isApmSignal(serviceEntitySummary.signalTypes as SignalTypes[]) &&
  // isLogsSignal(serviceEntitySummary.signalTypes as SignalTypes[]);

  // const [dismissedLogsOnlyEmptyState, setdismissedLogsOnlyEmptyState] = useLocalStorage(
  //   `apm.dismissedLogsOnlyEmptyState.${tabName}`,
  //   false
  // );

  // const displayEmptyStateOnly = tabName !== 'overview';

  return <>{children}</>;

  // commented/blocked until PR #191183 is merged
  // return (
  //   <>
  //     {hasOnlyLogsSignal ? (
  //       <>
  //         {displayEmptyStateOnly ? (
  //           <ServiceTabEmptyState
  //             title={emptyStateContent[tabName].title}
  //             content={emptyStateContent[tabName].content}
  //             imgSrc={emptyStateContent[tabName].imgSrc ?? null}
  //           />
  //         ) : (
  //           <>
  //             {!dismissedLogsOnlyEmptyState && (
  //               <ServiceTabEmptyState
  //                 title={emptyStateContent[tabName].title}
  //                 content={emptyStateContent[tabName].content}
  //                 imgSrc={emptyStateContent[tabName].imgSrc ?? null}
  //                 dismissable={true}
  //                 onDissmiss={() => setdismissedLogsOnlyEmptyState(true)}
  //               />
  //             )}
  //             <EuiSpacer size="m" />

  //             {children}
  //           </>
  //         )}
  //       </>
  //     ) : (
  //       <>{children}</>
  //     )}
  //   </>
  // );
}
