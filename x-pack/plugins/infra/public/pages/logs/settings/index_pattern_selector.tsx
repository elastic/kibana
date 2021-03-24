/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo } from 'react';
import { useKibanaIndexPatternTitles } from '../../../hooks/use_kibana_index_patterns';

export const IndexPatternSelector: React.FC<{
  isLoading: boolean;
  isReadOnly: boolean;
}> = ({ isLoading, isReadOnly }) => {
  const {
    indexPatternTitles: availableIndexPatterns,
    latestIndexPatternTitlesRequest,
    fetchIndexPatternTitles,
  } = useKibanaIndexPatternTitles();

  useEffect(() => {
    fetchIndexPatternTitles();
  }, [fetchIndexPatternTitles]);

  const availableOptions = useMemo<EuiComboBoxOptionOption[]>(
    () =>
      availableIndexPatterns.map(({ id, title }) => ({
        key: id,
        label: title,
        value: id,
      })),
    [availableIndexPatterns]
  );

  return (
    <EuiComboBox
      isLoading={isLoading || latestIndexPatternTitlesRequest.state === 'pending'}
      isDisabled={isReadOnly}
      options={availableOptions}
      placeholder={indexPatternSelectorPlaceholder}
      singleSelection={plainTextSingleSelection}
    />
  );
};

const plainTextSingleSelection = {
  asPlainText: true,
};

const indexPatternSelectorPlaceholder = i18n.translate(
  'xpack.infra.logSourceConfiguration.indexPatternSelectorPlaceholder',
  { defaultMessage: 'Choose an index pattern' }
);
