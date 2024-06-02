/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  EuiAccordion,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiCallOut,
  EuiButton,
  EuiIcon,
  EuiText,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCode,
} from '@elastic/eui';
import type { BoolQuery, TimeRange, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntityRiskScoreRecord } from '../../../common/api/entity_analytics/common';
import {
  RiskScoreEntity,
  RISK_SCORE_INDEX_PATTERN,
} from '../../../common/entity_analytics/risk_engine';
import { RiskScorePreviewTable } from './risk_score_preview_table';
import * as i18n from '../translations';
import { useRiskScorePreview } from '../api/hooks/use_preview_risk_scores';
import { useKibana } from '../../common/lib/kibana';
import { SourcererScopeName } from '../../sourcerer/store/model';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import type { RiskEngineMissingPrivilegesResponse } from '../hooks/use_missing_risk_engine_privileges';
import { userHasRiskEngineReadPermissions } from '../common';
interface IRiskScorePreviewPanel {
  showMessage: string;
  hideMessage: string;
  isLoading: boolean;
  items: EntityRiskScoreRecord[];
  type: RiskScoreEntity;
}

const getRiskiestScores = (scores: EntityRiskScoreRecord[] = [], field: string) =>
  scores
    ?.filter((item) => item?.id_field === field)
    ?.sort((a, b) => b?.calculated_score_norm - a?.calculated_score_norm)
    ?.slice(0, 5) || [];

export const RiskScorePreviewSection: React.FC<{
  privileges: RiskEngineMissingPrivilegesResponse;
}> = ({ privileges }) => {
  const sectionBody = useMemo(() => {
    if (privileges.isLoading) {
      return (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    if (userHasRiskEngineReadPermissions(privileges)) {
      return <RiskEnginePreview />;
    }

    return <MissingPermissionsCallout />;
  }, [privileges]);

  return (
    <>
      <EuiTitle>
        <h2>{i18n.PREVIEW}</h2>
      </EuiTitle>
      <EuiSpacer size={'s'} />
      {sectionBody}
    </>
  );
};

const MissingPermissionsCallout = () => {
  return (
    <EuiCallOut
      title={i18n.PREVIEW_MISSING_PERMISSIONS_TITLE}
      color="primary"
      iconType="iInCircle"
      data-test-subj="missing-risk-engine-preview-permissions"
    >
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.riskScore.riskScorePreview.missingPermissionsCallout.description"
          defaultMessage="Read permission is required for the {index} index pattern in order to preview data. Contact your administrator for further assistance."
          values={{
            index: <EuiCode>{RISK_SCORE_INDEX_PATTERN}</EuiCode>,
          }}
        />
      </EuiText>
    </EuiCallOut>
  );
};

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

const RiskEnginePreview = () => {
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: 'now-24h',
    to: 'now',
  });

  const [filters, setFilters] = useState<{ bool: BoolQuery }>({
    bool: { must: [], filter: [], should: [], must_not: [] },
  });

  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const { addError } = useAppToasts();

  const { indexPattern } = useSourcererDataView(SourcererScopeName.detections);

  const { data, isLoading, refetch, isError } = useRiskScorePreview({
    data_view_id: indexPattern.title, // TODO @nkhristinin verify this is correct
    filter: filters,
    range: {
      start: dateRange.from,
      end: dateRange.to,
    },
  });

  const hosts = getRiskiestScores(data?.scores.host, 'host.name');
  const users = getRiskiestScores(data?.scores.user, 'user.name');

  const onQuerySubmit = useCallback(
    (payload: { dateRange: TimeRange; query?: Query }) => {
      setDateRange({
        from: payload.dateRange.from,
        to: payload.dateRange.to,
      });
      try {
        const newFilters = buildEsQuery(
          undefined,
          payload.query ?? { query: '', language: 'kuery' },
          []
        );
        setFilters(newFilters);
      } catch (e) {
        addError(e, { title: i18n.PREVIEW_QUERY_ERROR_TITLE });
      }
    },
    [addError, setDateRange, setFilters]
  );

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
      <EuiText>{i18n.PREVIEW_DESCRIPTION}</EuiText>
      <EuiSpacer />
      <EuiFormRow fullWidth data-test-subj="risk-score-preview-search-bar">
        {indexPattern && (
          <SearchBar
            appName="siem"
            isLoading={isLoading}
            indexPatterns={[indexPattern] as DataView[]}
            dateRangeFrom={dateRange.from}
            dateRangeTo={dateRange.to}
            onQuerySubmit={onQuerySubmit}
            showFilterBar={false}
            showDatePicker={true}
            displayStyle={'inPage'}
            submitButtonStyle={'iconOnly'}
          />
        )}
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
