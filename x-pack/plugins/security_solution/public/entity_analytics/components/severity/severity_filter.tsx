/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { MultiselectFilterProps } from '../../../common/components/multiselect_filter';
import { MultiselectFilter } from '../../../common/components/multiselect_filter';
import { SEVERITY_UI_SORT_ORDER } from '../../common/utils';
import type { RiskScoreEntity, RiskSeverity } from '../../../../common/search_strategy';
import { RiskScoreLevel } from './common';
import { ENTITY_RISK_LEVEL } from '../risk_score/translations';
import { useKibana } from '../../../common/lib/kibana';
import { EntityEventTypes } from '../../../common/lib/telemetry';

export interface SeverityFilterProps {
  riskEntity?: RiskScoreEntity;
  onSelect: (newSelection: RiskSeverity[]) => void;
  selectedItems: RiskSeverity[];
}

export const SeverityFilter: React.FC<SeverityFilterProps> = ({
  onSelect,
  selectedItems,
  riskEntity,
}) => {
  const { telemetry } = useKibana().services;
  const renderItem = useCallback((severity: RiskSeverity) => {
    return <RiskScoreLevel data-test-subj={`risk-filter-item-${severity}`} severity={severity} />;
  }, []);

  const updateSeverityFilter = useCallback<
    NonNullable<MultiselectFilterProps<RiskSeverity>['onSelectionChange']>
  >(
    (newSelection, changedSeverity, changedStatus) => {
      if (changedStatus === 'on') {
        telemetry.reportEvent(EntityEventTypes.EntityRiskFiltered, {
          entity: riskEntity,
          selectedSeverity: changedSeverity,
        });
      }

      onSelect(newSelection);
    },
    [onSelect, riskEntity, telemetry]
  );

  return (
    <MultiselectFilter<RiskSeverity>
      data-test-subj="risk-filter"
      title={ENTITY_RISK_LEVEL(riskEntity)}
      items={SEVERITY_UI_SORT_ORDER}
      selectedItems={selectedItems}
      onSelectionChange={updateSeverityFilter}
      renderItem={renderItem}
      width={150}
    />
  );
};
