/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiRadioGroup,
  EuiRadioGroupOption,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Entity } from './entity_control';
import { UiPartitionFieldConfig } from '../series_controls/series_controls';
import { EntityFieldType } from '../../../../../common/types/anomalies';

interface EntityConfigProps {
  entity: Entity;
  isModelPlotEnabled: boolean;
  config: UiPartitionFieldConfig;
  onConfigChange: (fieldType: EntityFieldType, config: Partial<UiPartitionFieldConfig>) => void;
}

export const EntityConfig: FC<EntityConfigProps> = ({
  entity,
  isModelPlotEnabled,
  config,
  onConfigChange,
}) => {
  const [isEntityConfigPopoverOpen, setIsEntityConfigPopoverOpen] = useState(false);

  const forceSortByName = isModelPlotEnabled && !config?.anomalousOnly;

  const sortOptions: EuiRadioGroupOption[] = useMemo(() => {
    return [
      {
        id: 'anomaly_score',
        label: i18n.translate('xpack.ml.timeSeriesExplorer.sortByScoreLabel', {
          defaultMessage: 'Anomaly score',
        }),
        disabled: forceSortByName,
      },
      {
        id: 'name',
        label: i18n.translate('xpack.ml.timeSeriesExplorer.sortByNameLabel', {
          defaultMessage: 'Name',
        }),
      },
    ];
  }, [isModelPlotEnabled, config]);

  const orderOptions: EuiRadioGroupOption[] = useMemo(() => {
    return [
      {
        id: 'asc',
        label: i18n.translate('xpack.ml.timeSeriesExplorer.ascOptionsOrderLabel', {
          defaultMessage: 'asc',
        }),
      },
      {
        id: 'desc',
        label: i18n.translate('xpack.ml.timeSeriesExplorer.descOptionsOrderLabel', {
          defaultMessage: 'desc',
        }),
      },
    ];
  }, []);

  return (
    <EuiPopover
      ownFocus
      style={{ height: '40px' }}
      button={
        <EuiButtonIcon
          color="text"
          iconSize="m"
          iconType="gear"
          aria-label={i18n.translate('xpack.ml.timeSeriesExplorer.editControlConfiguration', {
            defaultMessage: 'Edit field configuration',
          })}
          onClick={() => {
            setIsEntityConfigPopoverOpen(!isEntityConfigPopoverOpen);
          }}
          data-test-subj={`mlSingleMetricViewerEntitySelectionConfigButton_${entity.fieldName}`}
        />
      }
      isOpen={isEntityConfigPopoverOpen}
      closePopover={() => {
        setIsEntityConfigPopoverOpen(false);
      }}
    >
      <div data-test-subj={`mlSingleMetricViewerEntitySelectionConfigPopover_${entity.fieldName}`}>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.ml.timeSeriesExplorer.sortByLabel"
              defaultMessage="Sort by"
            />
          }
        >
          <EuiRadioGroup
            options={sortOptions}
            idSelected={forceSortByName ? 'name' : config?.sort?.by}
            onChange={(id) => {
              onConfigChange(entity.fieldType, {
                sort: {
                  order: config.sort.order,
                  by: id as UiPartitionFieldConfig['sort']['by'],
                },
              });
            }}
            compressed
            data-test-subj={`mlSingleMetricViewerEntitySelectionConfigSortBy_${entity.fieldName}`}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage id="xpack.ml.timeSeriesExplorer.orderLabel" defaultMessage="Order" />
          }
        >
          <EuiRadioGroup
            options={orderOptions}
            idSelected={config?.sort?.order}
            onChange={(id) => {
              onConfigChange(entity.fieldType, {
                sort: {
                  by: config.sort.by,
                  order: id as UiPartitionFieldConfig['sort']['order'],
                },
              });
            }}
            compressed
            data-test-subj={`mlSingleMetricViewerEntitySelectionConfigOrder_${entity.fieldName}`}
          />
        </EuiFormRow>

        <EuiHorizontalRule margin="s" />

        <EuiFlexGroup gutterSize={'xs'} alignItems={'center'}>
          <EuiFlexItem grow={false}>
            {isModelPlotEnabled ? (
              <EuiSwitch
                label={
                  <FormattedMessage
                    id="xpack.ml.timeSeriesExplorer.anomalousOnlyLabel"
                    defaultMessage="Anomalous only"
                  />
                }
                checked={config.anomalousOnly}
                onChange={(e) => {
                  const isAnomalousOnly = e.target.checked;
                  onConfigChange(entity.fieldType, {
                    anomalousOnly: isAnomalousOnly,
                    sort: {
                      order: config.sort.order,
                      by: config.sort.by,
                    },
                  });
                }}
                compressed
                data-test-subj={`mlSingleMetricViewerEntitySelectionConfigAnomalousOnly_${entity.fieldName}`}
              />
            ) : (
              <EuiSwitch
                label={
                  <FormattedMessage
                    id="xpack.ml.timeSeriesExplorer.applyTimeRangeLabel"
                    defaultMessage="Apply time range"
                  />
                }
                checked={config.applyTimeRange}
                onChange={(e) => {
                  const applyTimeRange = e.target.checked;
                  onConfigChange(entity.fieldType, {
                    applyTimeRange,
                  });
                }}
                compressed
                data-test-subj={`mlSingleMetricViewerEntitySelectionConfigAnomalousOnly_${entity.fieldName}`}
              />
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false} style={{ width: '16px' }}>
            {isModelPlotEnabled && !config?.anomalousOnly ? (
              <EuiToolTip
                position="top"
                content={
                  <FormattedMessage
                    id="xpack.ml.timeSeriesExplorer.nonAnomalousResultsWithModelPlotInfo"
                    defaultMessage="The list contains values from the model plot results."
                  />
                }
              >
                <EuiIcon tabIndex={0} type="iInCircle" color={'subdued'} />
              </EuiToolTip>
            ) : null}

            {!isModelPlotEnabled && !config?.applyTimeRange ? (
              <EuiToolTip
                position="top"
                content={
                  <FormattedMessage
                    id="xpack.ml.timeSeriesExplorer.ignoreTimeRangeInfo"
                    defaultMessage="The list contains values from all anomalies created during the lifetime of the job."
                  />
                }
              >
                <EuiIcon tabIndex={0} type="iInCircle" color={'subdued'} />
              </EuiToolTip>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
