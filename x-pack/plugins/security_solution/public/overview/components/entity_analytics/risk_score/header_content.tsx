/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { RiskSeverity, RiskScoreEntity } from '../../../../../common/search_strategy';
import { SeverityFilterGroup } from '../../../../explore/components/risk_score/severity/severity_filter_group';
import type { SeverityCount } from '../../../../explore/components/risk_score/severity/types';
import { EMPTY_SEVERITY_COUNT } from '../../../../../common/search_strategy';
import { LinkButton, useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import type { SecurityPageName } from '../../../../../common/constants';
import * as i18n from './translations';
import { RiskInformationButtonEmpty } from '../../../../explore/components/risk_score/risk_information';

const RiskScoreHeaderContentComponent = ({
  entityLinkProps,
  onSelectSeverityFilterGroup,
  riskEntity,
  selectedSeverity,
  severityCount,
  toggleStatus,
}: {
  entityLinkProps: {
    deepLinkId: SecurityPageName;
    path: string;
    onClick: () => void;
  };
  onSelectSeverityFilterGroup: (newSelection: RiskSeverity[]) => void;
  riskEntity: RiskScoreEntity;
  selectedSeverity: RiskSeverity[];
  severityCount: SeverityCount | undefined;
  toggleStatus: boolean;
}) => {
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();

  const [goToEntityRiskTab, entityRiskTabUrl] = useMemo(() => {
    const { onClick, href } = getSecuritySolutionLinkProps(entityLinkProps);
    return [onClick, href];
  }, [entityLinkProps, getSecuritySolutionLinkProps]);
  return toggleStatus ? (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="m"
      data-test-subj={`${riskEntity}-risk-score-header-content`}
    >
      <EuiFlexItem>
        <RiskInformationButtonEmpty riskEntity={riskEntity} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SeverityFilterGroup
          selectedSeverities={selectedSeverity}
          severityCount={severityCount ?? EMPTY_SEVERITY_COUNT}
          riskEntity={riskEntity}
          onSelect={onSelectSeverityFilterGroup}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <LinkButton
          data-test-subj="view-all-button"
          onClick={goToEntityRiskTab}
          href={entityRiskTabUrl}
        >
          {i18n.VIEW_ALL}
        </LinkButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
};

export const RiskScoreHeaderContent = React.memo(RiskScoreHeaderContentComponent);
