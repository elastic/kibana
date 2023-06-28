/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { OnTimeChangeProps } from '@elastic/eui';
import {
  EuiAccordion,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiTitle,
  EuiCallOut,
  EuiButton,
  EuiIcon,
} from '@elastic/eui';
import { RiskScoreEntity } from '../../../common/risk_engine/types';
import { RiskScorePreviewTable } from './risk_score_preview_table';
import * as i18n from '../translations';
import type { RiskScore } from '../../../server/lib/risk_engine/types';
import { useRiskScorePreview } from '../api/hooks/use_preview_risk_scores';

interface IRiskScorePreviewPanel {
  showMessage: string;
  hideMessage: string;
  isLoading: boolean;
  items: RiskScore[];
  type: RiskScoreEntity;
}

const getRiskiestScores = (scores: RiskScore[] = [], field: string) =>
  scores
    ?.filter((item) => item?.identifierField === field)
    ?.sort((a, b) => b?.totalScoreNormalized - a?.totalScoreNormalized)
    ?.slice(0, 5) || [];

const RiskScorePreviewPanel = ({
  items,
  showMessage,
  hideMessage,
  isLoading,
  type,
}: IRiskScorePreviewPanel) => {
  const [trigger, setTrigger] = useState<'closed' | 'open'>('open');
  const onToggle = (isOpen: boolean) => {
    const newState = isOpen ? 'open' : 'closed';
    setTrigger(newState);
  };

  return (
    <EuiPanel hasBorder={true}>
      <EuiAccordion
        initialIsOpen={true}
        isLoading={isLoading}
        id={'host-table'}
        buttonContent={trigger === 'closed' ? showMessage : hideMessage}
        forceState={trigger}
        onToggle={onToggle}
        extraAction={<EuiIcon type={type === RiskScoreEntity.host ? 'storage' : 'user'} />}
      >
        <>
          <EuiSpacer size={'m'} />
          <RiskScorePreviewTable items={items} type={type} />
        </>
      </EuiAccordion>
    </EuiPanel>
  );
};

export const RiskScorePreviewSection = () => {
  const [start, setStart] = useState('now-24h');
  const [end, setEnd] = useState('now');

  const { data, isLoading, refetch, isError } = useRiskScorePreview({
    range: {
      start,
      end,
    },
  });

  const onTimeChangeCallback = (props: OnTimeChangeProps) => {
    setStart(props.start);
    setEnd(props.end);
  };

  const hosts = getRiskiestScores(data?.scores, 'host.name');
  const users = getRiskiestScores(data?.scores, 'user.name');

  if (isError) {
    return (
      <EuiCallOut
        data-test-subj="risk-preview-error"
        title={i18n.PREVIEW_ERROR_TITLE}
        color="danger"
        iconType="error"
      >
        <p>{i18n.PREVIEW_ERROR_MESSAGE}</p>
        <EuiButton
          data-test-subj="risk-preview-error-button"
          color="danger"
          onClick={() => refetch()}
        >
          {i18n.PREVIEW_ERROR_TRY_AGAIN}
        </EuiButton>
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiTitle>
        <h2>{i18n.PREVIEW}</h2>
      </EuiTitle>
      <EuiSpacer />
      <EuiFormRow fullWidth>
        <EuiSuperDatePicker
          start={start}
          end={end}
          onTimeChange={onTimeChangeCallback}
          onRefresh={() => refetch()}
          isLoading={isLoading}
          width="full"
        />
      </EuiFormRow>

      <EuiSpacer />

      <RiskScorePreviewPanel
        items={hosts}
        showMessage={i18n.SHOW_HOSTS_RISK_SCORE}
        hideMessage={i18n.HIDE_HOSTS_RISK_SCORE}
        isLoading={isLoading}
        type={RiskScoreEntity.host}
      />

      <EuiSpacer />

      <RiskScorePreviewPanel
        items={users}
        showMessage={i18n.SHOW_USERS_RISK_SCORE}
        hideMessage={i18n.HIDE_USERS_RISK_SCORE}
        isLoading={isLoading}
        type={RiskScoreEntity.user}
      />
    </>
  );
};
