/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect, EuiSelectProps } from '@elastic/eui';
import { debounce } from 'lodash';
import { lastValueFrom } from 'rxjs';
import { EntityControl } from '../entity_control';
import { mlJobService } from '../../../services/job_service';
import { Detector, JobId } from '../../../../../common/types/anomaly_detection_jobs';
import { useMlKibana } from '../../../contexts/kibana';
import { APP_STATE_ACTION } from '../../timeseriesexplorer_constants';
import {
  ComboBoxOption,
  EMPTY_FIELD_VALUE_LABEL,
  EntityControlProps,
} from '../entity_control/entity_control';
import { getControlsForDetector } from '../../get_controls_for_detector';
import {
  ML_ENTITY_FIELDS_CONFIG,
  PartitionFieldConfig,
  PartitionFieldsConfig,
} from '../../../../../common/types/storage';
import { useStorage } from '../../../contexts/ml/use_storage';
import { EntityFieldType } from '../../../../../common/types/anomalies';
import { FieldDefinition } from '../../../services/results_service/result_service_rx';
import { getViewableDetectors } from '../../timeseriesexplorer_utils/get_viewable_detectors';
import { PlotByFunctionControls } from '../plot_function_controls';

function getEntityControlOptions(fieldValues: FieldDefinition['values']): ComboBoxOption[] {
  if (!Array.isArray(fieldValues)) {
    return [];
  }

  return fieldValues.map((value) => {
    return { label: value.value === '' ? EMPTY_FIELD_VALUE_LABEL : value.value, value };
  });
}

export type UiPartitionFieldsConfig = Exclude<PartitionFieldsConfig, undefined>;

export type UiPartitionFieldConfig = Exclude<PartitionFieldConfig, undefined>;

/**
 * Provides default fields configuration.
 */
const getDefaultFieldConfig = (
  fieldTypes: EntityFieldType[],
  isAnomalousOnly: boolean,
  applyTimeRange: boolean
): UiPartitionFieldsConfig => {
  return fieldTypes.reduce((acc, f) => {
    acc[f] = {
      applyTimeRange,
      anomalousOnly: isAnomalousOnly,
      sort: { by: 'anomaly_score', order: 'desc' },
    };
    return acc;
  }, {} as UiPartitionFieldsConfig);
};

interface SeriesControlsProps {
  selectedDetectorIndex: number;
  selectedJobId: JobId;
  bounds: any;
  appStateHandler: Function;
  selectedEntities: Record<string, any>;
  functionDescription: string;
  setFunctionDescription: (func: string) => void;
}

/**
 * Component for handling the detector and entities controls.
 */
export const SeriesControls: FC<SeriesControlsProps> = ({
  bounds,
  selectedDetectorIndex,
  selectedJobId,
  appStateHandler,
  children,
  selectedEntities,
  functionDescription,
  setFunctionDescription,
}) => {
  const {
    services: {
      mlServices: {
        mlApiServices: { results: mlResultsService },
      },
    },
  } = useMlKibana();

  const selectedJob = useMemo(() => mlJobService.getJob(selectedJobId), [selectedJobId]);

  const isModelPlotEnabled = !!selectedJob.model_plot_config?.enabled;

  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entityValues, setEntityValues] = useState<Record<string, FieldDefinition['values']>>({});

  const detectors: Array<{
    index: number;
    detector_description: Detector['detector_description'];
  }> = useMemo(() => {
    return getViewableDetectors(selectedJob);
  }, [selectedJob]);

  const entityControls = useMemo(() => {
    return getControlsForDetector(selectedDetectorIndex, selectedEntities, selectedJobId);
  }, [selectedDetectorIndex, selectedEntities, selectedJobId]);

  const [storageFieldsConfig, setStorageFieldsConfig] =
    useStorage<PartitionFieldsConfig>(ML_ENTITY_FIELDS_CONFIG);

  // Merge the default config with the one from the local storage
  const resultFieldsConfig = useMemo(() => {
    return {
      ...getDefaultFieldConfig(
        entityControls.map((v) => v.fieldType),
        !storageFieldsConfig
          ? true
          : Object.values(storageFieldsConfig).some((v) => !!v?.anomalousOnly),
        !storageFieldsConfig
          ? true
          : Object.values(storageFieldsConfig).some((v) => !!v?.applyTimeRange)
      ),
      ...(!storageFieldsConfig ? {} : storageFieldsConfig),
    };
  }, [entityControls, storageFieldsConfig]);

  /**
   * Loads available entity values.
   * @param {Object} searchTerm - Search term for partition, e.g. { partition_field: 'partition' }
   */
  const loadEntityValues = async (searchTerm = {}) => {
    setEntitiesLoading(true);

    // Populate the entity input data lists with the values from the top records by score
    // for the selected detector across the full time range. No need to pass through finish().
    const detectorIndex = selectedDetectorIndex;

    const fieldsConfig = resultFieldsConfig
      ? Object.fromEntries(
          Object.entries(resultFieldsConfig).filter(([k]) =>
            entityControls.some((v) => v.fieldType === k)
          )
        )
      : undefined;

    const {
      partition_field: partitionField,
      over_field: overField,
      by_field: byField,
    } = await lastValueFrom(
      mlResultsService.fetchPartitionFieldsValues(
        selectedJob.job_id,
        searchTerm,
        [
          {
            fieldName: 'detector_index',
            fieldValue: detectorIndex,
          },
        ],
        bounds.min.valueOf(),
        bounds.max.valueOf(),
        fieldsConfig
      )
    );

    const entityValuesUpdate: Record<string, any> = {};
    entityControls.forEach((entity) => {
      let fieldValues;

      if (partitionField?.name === entity.fieldName) {
        fieldValues = partitionField.values;
      }
      if (overField?.name === entity.fieldName) {
        fieldValues = overField.values;
      }
      if (byField?.name === entity.fieldName) {
        fieldValues = byField.values;
      }
      entityValuesUpdate[entity.fieldName] = fieldValues;
    });

    setEntitiesLoading(false);
    setEntityValues(entityValuesUpdate);
  };

  useEffect(() => {
    loadEntityValues();
  }, [selectedJobId, selectedDetectorIndex, JSON.stringify(selectedEntities), resultFieldsConfig]);

  const entityFieldSearchChanged = debounce(async (entity, queryTerm) => {
    await loadEntityValues({
      [entity.fieldType]: queryTerm,
    });
  }, 500);

  const entityFieldValueChanged: EntityControlProps['entityFieldValueChanged'] = (
    entity,
    fieldValue
  ) => {
    const resultEntities = {
      ...entityControls.reduce((appStateEntities, appStateEntity) => {
        appStateEntities[appStateEntity.fieldName] = appStateEntity.fieldValue;
        return appStateEntities;
      }, {} as Record<string, any>),
      [entity.fieldName]: fieldValue,
    };

    appStateHandler(APP_STATE_ACTION.SET_ENTITIES, resultEntities);
  };

  const detectorIndexChangeHandler: EuiSelectProps['onChange'] = useCallback(
    (e) => {
      const id = e.target.value;
      if (id !== undefined) {
        appStateHandler(APP_STATE_ACTION.SET_DETECTOR_INDEX, +id);
      }
    },
    [appStateHandler]
  );

  const detectorSelectOptions = detectors.map((d) => ({
    value: d.index,
    text: d.detector_description,
  }));

  const onFieldConfigChange: EntityControlProps['onConfigChange'] = useCallback(
    (fieldType, config) => {
      const updatedFieldConfig = {
        ...(resultFieldsConfig[fieldType] ? resultFieldsConfig[fieldType] : {}),
        ...config,
      } as UiPartitionFieldConfig;

      const updatedResultConfig = { ...resultFieldsConfig };

      if (resultFieldsConfig[fieldType]?.anomalousOnly !== updatedFieldConfig.anomalousOnly) {
        // In case anomalous selector has been changed
        // we need to change it for all the other fields
        for (const c in updatedResultConfig) {
          if (updatedResultConfig.hasOwnProperty(c)) {
            updatedResultConfig[c as EntityFieldType]!.anomalousOnly =
              updatedFieldConfig.anomalousOnly;
          }
        }
      }

      if (resultFieldsConfig[fieldType]?.applyTimeRange !== updatedFieldConfig.applyTimeRange) {
        // In case time range selector has been changed
        // we need to change it for all the other fields
        for (const c in updatedResultConfig) {
          if (updatedResultConfig.hasOwnProperty(c)) {
            updatedResultConfig[c as EntityFieldType]!.applyTimeRange =
              updatedFieldConfig.applyTimeRange;
          }
        }
      }

      setStorageFieldsConfig({
        ...updatedResultConfig,
        [fieldType]: updatedFieldConfig,
      });
    },
    [resultFieldsConfig, setStorageFieldsConfig]
  );

  /** Indicates if any of the previous controls is empty */
  let hasEmptyFieldValues = false;

  return (
    <div data-test-subj="mlSingleMetricViewerSeriesControls">
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.timeSeriesExplorer.detectorLabel"
                defaultMessage="Detector"
              />
            }
          >
            <EuiSelect
              onChange={detectorIndexChangeHandler}
              value={selectedDetectorIndex}
              options={detectorSelectOptions}
              data-test-subj="mlSingleMetricViewerDetectorSelect"
            />
          </EuiFormRow>
        </EuiFlexItem>
        {entityControls.map((entity) => {
          const entityKey = `${entity.fieldName}`;
          const forceSelection = !hasEmptyFieldValues && entity.fieldValue === null;
          hasEmptyFieldValues = !hasEmptyFieldValues && forceSelection;
          return (
            <EntityControl
              entity={entity}
              entityFieldValueChanged={entityFieldValueChanged}
              isLoading={entitiesLoading}
              onSearchChange={entityFieldSearchChanged}
              config={resultFieldsConfig[entity.fieldType]!}
              onConfigChange={onFieldConfigChange}
              forceSelection={forceSelection}
              key={entityKey}
              options={getEntityControlOptions(entityValues[entity.fieldName])}
              isModelPlotEnabled={isModelPlotEnabled}
            />
          );
        })}
        <PlotByFunctionControls
          selectedJobId={selectedJobId}
          selectedDetectorIndex={selectedDetectorIndex}
          selectedEntities={selectedEntities}
          functionDescription={functionDescription}
          setFunctionDescription={setFunctionDescription}
          entityControlsCount={entityControls.length}
        />

        {children}
      </EuiFlexGroup>
    </div>
  );
};
