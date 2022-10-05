/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { EuiComboBox, type EuiComboBoxOptionOption, type EuiComboBoxProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMlApiContext } from '../../contexts/kibana';

type EntityType = 'anomaly_detector' | 'data_frame_analytics' | 'trained_models';

type EntitiesSelection = Array<{ id: string; type: EntityType }>;

export interface MlEntitySelectorProps {
  entityTypes?: EntityType[];
  multiSelect?: boolean;
  selectedOptions?: any;
  onSelectionChange?: (jobSelection: EntitiesSelection) => void;
}

export const MlEntitySelector: FC<MlEntitySelectorProps> = ({
  entityTypes = ['anomaly_detector', 'data_frame_analytics', 'trained_models'],
  multiSelect = true,
  selectedOptions,
  onSelectionChange,
}) => {
  const { jobs: jobsApi, trainedModels, dataFrameAnalytics } = useMlApiContext();

  const jobIds = useMemo(() => new Set(), []);
  const groupIds = useMemo(() => new Set(), []);
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);

  const fetchOptions = useCallback(async () => {
    try {
      const { jobIds: jobIdOptions, groupIds: groupIdOptions } =
        await jobsApi.getAllJobAndGroupIds();

      jobIdOptions.forEach((v) => {
        jobIds.add(v);
      });
      groupIdOptions.forEach((v) => {
        groupIds.add(v);
      });

      setOptions([
        {
          label: i18n.translate('xpack.ml.jobSelector.jobOptionsLabel', {
            defaultMessage: 'Jobs',
          }),
          isGroupLabelOption: true,
          options: jobIdOptions.map((v) => ({ label: v, value: v })),
        },
        ...(multiSelect
          ? [
              {
                label: i18n.translate('xpack.ml.jobSelector.groupOptionsLabel', {
                  defaultMessage: 'Groups',
                }),
                isGroupLabelOption: true,
                options: groupIdOptions.map((v) => ({ label: v, value: v })),
              },
            ]
          : []),
      ]);
    } catch (e) {
      // TODO add error handling
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsApi]);

  useEffect(
    function fetchOptionsOnMount() {
      fetchOptions();
    },
    [fetchOptions]
  );

  const onChange = useCallback<Exclude<EuiComboBoxProps<string>['onChange'], undefined>>(
    (selection) => {
      if (!onSelectionChange) return;
      onSelectionChange(selection.map((s) => ({ id: s.value as string, type: '' as EntityType })));
    },
    [onSelectionChange]
  );

  return (
    <EuiComboBox<string>
      singleSelection={!multiSelect}
      selectedOptions={selectedOptions}
      options={options}
      onChange={onChange}
      fullWidth
      data-test-subj={'mlEntitySelector'}
      isInvalid={false}
    />
  );
};
