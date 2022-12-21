/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useKibanaIndexPatternTitles } from '../../../hooks/use_kibana_index_patterns';

type IndexPatternOption = EuiComboBoxOptionOption<string>;

export const IndexPatternSelector: React.FC<{
  indexPatternId: string | undefined;
  isLoading: boolean;
  isReadOnly: boolean;
  onChangeIndexPatternId: (indexPatternId: string | undefined) => void;
}> = ({ indexPatternId, isLoading, isReadOnly, onChangeIndexPatternId }) => {
  const {
    indexPatternTitles: availableIndexPatterns,
    latestIndexPatternTitlesRequest,
    fetchIndexPatternTitles,
  } = useKibanaIndexPatternTitles();

  useEffect(() => {
    fetchIndexPatternTitles();
  }, [fetchIndexPatternTitles]);

  const availableOptions = useMemo<IndexPatternOption[]>(() => {
    const options = [
      ...availableIndexPatterns.map(({ id, title }) => ({
        key: id,
        label: title,
        value: id,
      })),
      ...(indexPatternId == null || availableIndexPatterns.some(({ id }) => id === indexPatternId)
        ? []
        : [
            {
              key: indexPatternId,
              label: i18n.translate('xpack.infra.logSourceConfiguration.missingDataViewsLabel', {
                defaultMessage: `Missing data view {indexPatternId}`,
                values: {
                  indexPatternId,
                },
              }),
              value: indexPatternId,
            },
          ]),
    ];
    return options;
  }, [availableIndexPatterns, indexPatternId]);

  const selectedOptions = useMemo<IndexPatternOption[]>(
    () => availableOptions.filter(({ key }) => key === indexPatternId),
    [availableOptions, indexPatternId]
  );

  const changeSelectedIndexPatterns = useCallback(
    ([newlySelectedOption]: IndexPatternOption[]) => {
      if (typeof newlySelectedOption?.key === 'string') {
        return onChangeIndexPatternId(newlySelectedOption.key);
      }

      return onChangeIndexPatternId(undefined);
    },
    [onChangeIndexPatternId]
  );

  return (
    <EuiComboBox<string>
      isLoading={isLoading || latestIndexPatternTitlesRequest.state === 'pending'}
      isDisabled={isReadOnly}
      options={availableOptions}
      placeholder={indexPatternSelectorPlaceholder}
      selectedOptions={selectedOptions}
      singleSelection={{ asPlainText: true }}
      onChange={changeSelectedIndexPatterns}
    />
  );
};

const indexPatternSelectorPlaceholder = i18n.translate(
  'xpack.infra.logSourceConfiguration.dataViewSelectorPlaceholder',
  { defaultMessage: 'Choose a data view' }
);
