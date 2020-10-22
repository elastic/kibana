/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect, EuiSelectProps } from '@elastic/eui';
import { debounce } from 'lodash';
import { EntityControl } from '../entity_control';
import { mlJobService } from '../../../services/job_service';
import { Detector, JobId } from '../../../../../common/types/anomaly_detection_jobs';
import { useMlKibana } from '../../../contexts/kibana';
import { APP_STATE_ACTION } from '../../timeseriesexplorer_constants';
import { EMPTY_FIELD_VALUE_LABEL, EntityControlProps } from '../entity_control/entity_control';
import { getControlsForDetector } from '../../get_controls_for_detector';
// @ts-ignore
import { getViewableDetectors } from '../../timeseriesexplorer';
import {
  ML_PARTITION_FIELDS_CONFIG,
  PartitionFieldsConfig,
} from '../../../../../common/types/storage';
import { useStorage } from '../../../contexts/ml/use_storage';
import { EntityFieldType } from '../../../../../common/types/anomalies';

function getEntityControlOptions(fieldValues: any[]) {
  if (!Array.isArray(fieldValues)) {
    return [];
  }

  return fieldValues.map((value) => {
    return { label: value === '' ? EMPTY_FIELD_VALUE_LABEL : value, value };
  });
}

type UiPartitionFieldsConfig = Exclude<PartitionFieldsConfig, null>;

const getDefaultFieldConfig = (fieldTypes: EntityFieldType[]): UiPartitionFieldsConfig => {
  return fieldTypes.reduce((acc, f) => {
    acc[f] = { anomalousOnly: false, sort: { by: 'anomaly_score', order: 'desc' } };
    return acc;
  }, {} as UiPartitionFieldsConfig);
};

interface SeriesControlsProps {
  selectedDetectorIndex: any;
  selectedJobId: JobId;
  bounds: any;
  appStateHandler: Function;
  selectedEntities: Record<string, any>;
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
}) => {
  const {
    services: {
      mlServices: {
        mlApiServices: { results: mlResultsService },
      },
    },
  } = useMlKibana();

  const selectedJob = useMemo(() => mlJobService.getJob(selectedJobId), [selectedJobId]);

  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entityValues, setEntityValues] = useState<Record<string, any>>({});

  const detectors: Array<{
    index: number;
    detector_description: Detector['detector_description'];
  }> = useMemo(() => {
    return getViewableDetectors(selectedJob);
  }, [selectedJob]);

  const entityControls = useMemo(() => {
    return getControlsForDetector(selectedDetectorIndex, selectedEntities, selectedJobId);
  }, [selectedDetectorIndex, selectedEntities, selectedJobId]);

  const [partitionFieldsConfig, setPartitionFieldsConfig] = useStorage<UiPartitionFieldsConfig>(
    ML_PARTITION_FIELDS_CONFIG,
    getDefaultFieldConfig(entityControls.map((v) => v.fieldType))
  );

  /**
   * Loads available entity values.
   * @param {Object} searchTerm - Search term for partition, e.g. { partition_field: 'partition' }
   */
  const loadEntityValues = async (searchTerm = {}) => {
    setEntitiesLoading(true);

    // Populate the entity input data lists with the values from the top records by score
    // for the selected detector across the full time range. No need to pass through finish().
    const detectorIndex = selectedDetectorIndex;

    const fieldsConfig = partitionFieldsConfig
      ? Object.fromEntries(
          Object.entries(partitionFieldsConfig).filter(([k]) =>
            entityControls.some((v) => v.fieldType === k)
          )
        )
      : undefined;

    const {
      partition_field: partitionField,
      over_field: overField,
      by_field: byField,
    } = await mlResultsService
      .fetchPartitionFieldsValues(
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
      .toPromise();

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
  }, [
    selectedJobId,
    selectedDetectorIndex,
    JSON.stringify(selectedEntities),
    partitionFieldsConfig,
  ]);

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

  const onConfigChange: EntityControlProps['onConfigChange'] = useCallback(
    (fieldType, config) => {
      setPartitionFieldsConfig({
        ...partitionFieldsConfig,
        [fieldType]: {
          ...(partitionFieldsConfig[fieldType] ? partitionFieldsConfig[fieldType] : {}),
          ...config,
        },
      });
    },
    [partitionFieldsConfig, setPartitionFieldsConfig]
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
              config={partitionFieldsConfig?.[entity.fieldType]}
              onConfigChange={onConfigChange}
              forceSelection={forceSelection}
              key={entityKey}
              options={getEntityControlOptions(entityValues[entity.fieldName])}
            />
          );
        })}
        {children}
      </EuiFlexGroup>
    </div>
  );
};
