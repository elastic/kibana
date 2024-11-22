/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { MultiselectFilter } from '../../../common/components/multiselect_filter';
import { CriticalityLevels } from '../../../../common/constants';
import { AssetCriticalityBadge } from './asset_criticality_badge';

interface AssetCriticalityFilterProps {
  selectedItems: CriticalityLevels[];
  onChange: (selectedItems: CriticalityLevels[]) => void;
}

const ASSET_CRITICALITY_OPTIONS = [
  CriticalityLevels.EXTREME_IMPACT,
  CriticalityLevels.HIGH_IMPACT,
  CriticalityLevels.MEDIUM_IMPACT,
  CriticalityLevels.LOW_IMPACT,
];

export const AssetCriticalityFilter: React.FC<AssetCriticalityFilterProps> = ({
  selectedItems,
  onChange,
}) => {
  const renderItem = useCallback((level: CriticalityLevels) => {
    return <AssetCriticalityBadge criticalityLevel={level} style={{ lineHeight: 'inherit' }} />;
  }, []);

  return (
    <MultiselectFilter<CriticalityLevels>
      title={i18n.translate('xpack.securitySolution.entityAnalytics.assetCriticality.filterTitle', {
        defaultMessage: 'Criticality',
      })}
      items={ASSET_CRITICALITY_OPTIONS}
      selectedItems={selectedItems}
      onSelectionChange={onChange}
      renderItem={renderItem}
      width={190}
    />
  );
};
