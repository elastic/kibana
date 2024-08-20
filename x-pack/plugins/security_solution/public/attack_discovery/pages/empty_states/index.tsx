/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Failure } from '../failure';
import { EmptyPrompt } from '../empty_prompt';
import { showEmptyPrompt, showNoAlertsPrompt, showWelcomePrompt } from '../helpers';
import { NoAlerts } from '../no_alerts';
import { Welcome } from '../welcome';

interface Props {
  aiConnectorsCount: number | null;
  alertsContextCount: number | null;
  alertsCount: number;
  attackDiscoveriesCount: number;
  connectorId: string | undefined;
  failureReason: string | null;
  isLoading: boolean;
  onGenerate: () => Promise<void>;
}

const EmptyStatesComponent: React.FC<Props> = ({
  aiConnectorsCount,
  alertsContextCount,
  alertsCount,
  attackDiscoveriesCount,
  connectorId,
  failureReason,
  isLoading,
  onGenerate,
}) => {
  if (showWelcomePrompt({ aiConnectorsCount, isLoading })) {
    return <Welcome />;
  } else if (!isLoading && failureReason != null) {
    return <Failure failureReason={failureReason} />;
  } else if (showNoAlertsPrompt({ alertsContextCount, isLoading })) {
    return <NoAlerts />;
  } else if (showEmptyPrompt({ aiConnectorsCount, attackDiscoveriesCount, isLoading })) {
    return (
      <EmptyPrompt
        alertsCount={alertsCount}
        isDisabled={connectorId == null}
        isLoading={isLoading}
        onGenerate={onGenerate}
      />
    );
  }

  return null;
};

EmptyStatesComponent.displayName = 'EmptyStates';

export const EmptyStates = React.memo(EmptyStatesComponent);
