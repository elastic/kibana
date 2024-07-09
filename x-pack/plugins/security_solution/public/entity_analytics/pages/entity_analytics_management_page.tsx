/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiBetaBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';

import { RiskScorePreviewSection } from '../components/risk_score_preview_section';
import { RiskScoreEnableSection } from '../components/risk_score_enable_section';
import { ENTITY_ANALYTICS_RISK_SCORE } from '../../app/translations';
import { BETA } from '../../common/translations';
import { RiskEnginePrivilegesCallOut } from '../components/risk_engine_privileges_callout';
import { useMissingRiskEnginePrivileges } from '../hooks/use_missing_risk_engine_privileges';
import { useEntityModel } from '../common/entity_model';

export const EntityAnalyticsManagementPage = () => {
  const privileges = useMissingRiskEnginePrivileges();
  const { initialize, get, deleteAPI } = useEntityModel();
  const [state, setState] = useState('loading');

  useEffect(() => {
    get()
      ?.then((models) => {
        setState('installed');
      })
      .catch((error) => {
        // 404 means the model is not installed
        setState('uninstalled');
      });
  }, [get]);

  const handleInitialize = () => {
    setState('loading');
    initialize().then((response) => {
      setState('installed');
    });
  };

  const handleDelete = () => {
    setState('loading');
    deleteAPI().then((response) => {
      setState('uninstalled');
    });
  };

  return (
    <>
      <RiskEnginePrivilegesCallOut privileges={privileges} />
      <EuiFlexGroup gutterSize="s" alignItems="baseline">
        <EuiFlexItem grow={false}>
          <EuiPageHeader
            data-test-subj="entityAnalyticsManagementPageTitle"
            pageTitle={ENTITY_ANALYTICS_RISK_SCORE}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} />
        <EuiBetaBadge label={BETA} size="s" />
        {state === 'loading' && <EuiLoadingSpinner size="m" css={{ marginLeft: 'auto' }} />}
        {state === 'uninstalled' && (
          <EuiButton onClick={handleInitialize} css={{ marginLeft: 'auto' }}>
            {'Initialize Entity Model'}
          </EuiButton>
        )}
        {state === 'installed' && (
          <EuiButton onClick={handleDelete} css={{ marginLeft: 'auto' }}>
            {'Delete Entity Model'}
          </EuiButton>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={2}>
          <RiskScoreEnableSection privileges={privileges} />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <RiskScorePreviewSection privileges={privileges} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

EntityAnalyticsManagementPage.displayName = 'EntityAnalyticsManagementPage';
