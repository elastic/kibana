/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SyntheticsAvailabilityIndicator } from '@kbn/slo-schema';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { CreateSLOForm } from '../../types';
import { FieldSelector } from '../synthetics_common/field_selector';
import { DataPreviewChart } from '../common/data_preview_chart';

export function SyntheticsAvailabilityIndicatorTypeForm() {
  const { watch, setValue } = useFormContext<CreateSLOForm<SyntheticsAvailabilityIndicator>>();
  const [index, monitorIds = [], projects = [], tags = [], locations = []] = watch([
    'indicator.params.index',
    'indicator.params.monitorIds',
    'indicator.params.projects',
    'indicator.params.tags',
    'indicator.params.locations',
  ]);

  // const { isLoading: isIndexFieldsLoading, data: indexFields = [] } =
  //   useFetchIndexPatternFields('synthetics-*');
  // const partitionByFields = ['project', 'tags', 'location', 'monitor'];
  const filters = {
    monitorIds: monitorIds.map((id) => id.value),
    projects: projects.map((project) => project.value),
    tags: tags.map((tag) => tag.value),
    locations: locations.map((location) => location.value),
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup direction="row" gutterSize="l">
        <FieldSelector
          allowAllOption
          label={i18n.translate('xpack.observability.slo.sloEdit.syntheticsAvailability.monitor', {
            defaultMessage: 'Monitor name',
          })}
          placeholder={i18n.translate(
            'xpack.observability.slo.sloEdit.syntheticsAvailability.monitor.placeholder',
            { defaultMessage: 'Select the Synthetics monitor or choose all' }
          )}
          fieldName="monitorIds"
          name="indicator.params.monitorIds"
          filters={filters}
          dataTestSubj="syntheticsAvailabilityMonitorSelector"
          tooltip={
            <EuiIconTip
              content={i18n.translate(
                'xpack.observability.slo.sloEdit.syntheticsAvailability.monitor.tooltip',
                {
                  defaultMessage:
                    'This is the monitor or monitors part of this SLO. Select "*" to group by project, tag, or location',
                }
              )}
              position="top"
            />
          }
        />
        <FieldSelector
          allowAllOption
          label={i18n.translate('xpack.observability.slo.sloEdit.syntheticsAvailability.project', {
            defaultMessage: 'Project',
          })}
          placeholder={i18n.translate(
            'xpack.observability.slo.sloEdit.syntheticsAvailability.project.placeholder',
            {
              defaultMessage: 'Select the project',
            }
          )}
          fieldName="projects"
          name="indicator.params.projects"
          filters={filters}
          dataTestSubj="syntheticsAvailabilityProjectSelector"
        />
      </EuiFlexGroup>

      <EuiFlexGroup direction="row" gutterSize="l">
        <FieldSelector
          label={i18n.translate('xpack.observability.slo.sloEdit.syntheticsAvailability.tags', {
            defaultMessage: 'Tags',
          })}
          placeholder={i18n.translate(
            'xpack.observability.slo.sloEdit.syntheticsAvailability.tags.placeholder',
            {
              defaultMessage: 'Select tags',
            }
          )}
          fieldName="tags"
          name="indicator.params.tags"
          filters={filters}
          dataTestSubj="syntheticsAvailabilityTagsSelector"
        />
        <FieldSelector
          label={i18n.translate('xpack.observability.slo.sloEdit.syntheticsAvailability.location', {
            defaultMessage: 'Location',
          })}
          placeholder={i18n.translate(
            'xpack.observability.slo.sloEdit.syntheticsAvailability.location.placeholder',
            {
              defaultMessage: 'Select the monitor location',
            }
          )}
          fieldName="locations"
          name="indicator.params.locations"
          filters={filters}
          dataTestSubj="syntheticsAvailabilityLocationSelector"
        />
      </EuiFlexGroup>
      {/* 
      <EuiFlexGroup direction="row" gutterSize="l">
        <EuiFlexItem>
          <QueryBuilder
            dataTestSubj="syntheticsAvailabilityFilterInput"
            indexPatternString={watch('indicator.params.index')}
            label={i18n.translate('xpack.observability.slo.sloEdit.syntheticsAvailability.filter', {
              defaultMessage: 'Query filter',
            })}
            name="indicator.params.filter"
            placeholder={i18n.translate(
              'xpack.observability.slo.sloEdit.syntheticsAvailability.filter.placeholder',
              {
                defaultMessage: 'Custom filter to apply on the index',
              }
            )}
            tooltip={
              <EuiIconTip
                content={i18n.translate(
                  'xpack.observability.slo.sloEdit.syntheticsAvailability.filter.tooltip',
                  {
                    defaultMessage:
                      'This KQL query is used to filter the Synthetics data on some relevant criteria for this SLO.',
                  }
                )}
                position="top"
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup> */}

      {/* <IndexFieldSelector
        indexFields={partitionByFields}
        name="groupBy"
        defaultValue={ALL_VALUE}
        label={
          <span>
            {i18n.translate('xpack.observability.slo.sloEdit.groupBy.label', {
              defaultMessage: 'Partition by',
            })}{' '}
            <EuiIconTip
              content={i18n.translate('xpack.observability.slo.sloEdit.groupBy.tooltip', {
                defaultMessage: 'Create individual SLOs for each value of the selected field.',
              })}
              position="top"
            />
          </span>
        }
        placeholder={i18n.translate('xpack.observability.slo.sloEdit.groupBy.placeholder', {
          defaultMessage: 'Select an optional field to partition by',
        })}
        // isLoading={!!apmIndex && isIndexFieldsLoading}
        // isDisabled={!apmIndex}
      /> */}

      <DataPreviewChart />
    </EuiFlexGroup>
  );
}
