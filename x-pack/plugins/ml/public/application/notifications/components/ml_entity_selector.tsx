/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useState, useMemo } from 'react';
import {
  EuiComboBox,
  type EuiComboBoxOptionOption,
  type EuiComboBoxProps,
  euiPaletteColorBlindBehindText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMlApiContext } from '../../contexts/kibana';

type EntityType = 'anomaly_detector' | 'data_frame_analytics' | 'trained_models';

type EntitiesSelection = Array<{ value: string; label: string }>;

export interface MlEntitySelectorProps {
  entityTypes?: Record<EntityType, boolean>;
  multiSelect?: boolean;
  /**
   * Array of selected ids
   */
  selectedOptions?: string[];
  onSelectionChange?: (jobSelection: EntitiesSelection) => void;
}

export const MlEntitySelector: FC<MlEntitySelectorProps> = ({
  entityTypes = { anomaly_detector: true, data_frame_analytics: true, trained_models: true },
  multiSelect = true,
  selectedOptions,
  onSelectionChange,
}) => {
  const { jobs: jobsApi, trainedModels, dataFrameAnalytics } = useMlApiContext();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);

  const visColorsBehindText = euiPaletteColorBlindBehindText();

  const fetchOptions = useCallback(async () => {
    try {
      const newOptions: Array<EuiComboBoxOptionOption<string>> = [];
      if (entityTypes?.anomaly_detector) {
        const { jobIds: jobIdOptions } = await jobsApi.getAllJobAndGroupIds();

        newOptions.push({
          label: i18n.translate('xpack.ml.mlEntitySelector.jobOptionsLabel', {
            defaultMessage: 'Anomaly detection jobs',
          }),
          isGroupLabelOption: true,
          color: visColorsBehindText[0],
          options: jobIdOptions.map((v) => ({
            label: v,
            value: v,
            key: `anomaly_detector:${v}`,
            color: visColorsBehindText[0],
          })),
        });
      }

      if (entityTypes?.data_frame_analytics) {
        const dfa = await dataFrameAnalytics.getDataFrameAnalytics();
        if (dfa.count > 0) {
          newOptions.push({
            label: i18n.translate('xpack.ml.mlEntitySelector.dfaOptionsLabel', {
              defaultMessage: 'Data frame analytics',
            }),
            isGroupLabelOption: true,
            options: dfa.data_frame_analytics.map((v) => ({
              label: v.id,
              value: v.id,
              key: `data_frame_analytics:${v.id}`,
              color: visColorsBehindText[2],
            })),
          });
        }
      }

      if (entityTypes?.trained_models) {
        const models = await trainedModels.getTrainedModels();
        if (models.length > 0) {
          newOptions.push({
            label: i18n.translate('xpack.ml.mlEntitySelector.trainedModelsLabel', {
              defaultMessage: 'Trained models',
            }),
            isGroupLabelOption: true,
            options: models.map((v) => ({
              label: v.model_id,
              value: v.model_id,
              key: `trained_models:${v.model_id}`,
              color: visColorsBehindText[3],
            })),
          });
        }
      }

      setOptions(newOptions);
    } catch (e) {
      // TODO add error handling
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsApi, trainedModels, dataFrameAnalytics]);

  const selectedEntities = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    return (selectedOptions ?? []).flatMap((o) => {
      const fromOptions = options
        .flatMap((g) => g.options)
        .filter((op): op is EuiComboBoxOptionOption<string> => op!.value === o);
      return fromOptions.length > 0 ? fromOptions : [{ value: o, label: o, key: `unknown:${o}` }];
    });
  }, [options, selectedOptions]);

  useEffect(
    function fetchOptionsOnMount() {
      fetchOptions();
    },
    [fetchOptions]
  );

  const onChange = useCallback<Exclude<EuiComboBoxProps<string>['onChange'], undefined>>(
    (selection) => {
      if (!onSelectionChange) return;
      onSelectionChange(
        selection.map((s) => {
          return { value: s.value!, label: s.label };
        })
      );
    },
    [onSelectionChange]
  );

  return (
    <EuiComboBox<string>
      autoFocus={true}
      isLoading={isLoading}
      singleSelection={!multiSelect}
      selectedOptions={selectedEntities}
      options={options}
      onChange={onChange}
      fullWidth
      data-test-subj={'mlEntitySelector'}
      isInvalid={false}
    />
  );
};
