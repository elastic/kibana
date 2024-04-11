/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE, SyntheticsAvailabilityIndicator } from '@kbn/slo-schema';
import { useFormContext } from 'react-hook-form';
import { FieldSelector } from '../synthetics_common/field_selector';
import { CreateSLOForm } from '../../types';
import { DataPreviewChart } from '../common/data_preview_chart';
import { QueryBuilder } from '../common/query_builder';

const ONE_DAY_IN_MILLISECONDS = 1 * 60 * 60 * 1000 * 24;

export function SyntheticsAvailabilityIndicatorTypeForm() {
  const { watch } = useFormContext<CreateSLOForm<SyntheticsAvailabilityIndicator>>();

  const [monitorIds = [], projects = [], tags = [], index] = watch([
    'indicator.params.monitorIds',
    'indicator.params.projects',
    'indicator.params.tags',
    'indicator.params.index',
  ]);

  const [range, _] = useState({
    start: new Date().getTime() - ONE_DAY_IN_MILLISECONDS,
    end: new Date().getTime(),
  });

  const filters = {
    monitorIds: monitorIds.map((id) => id.value).filter((id) => id !== ALL_VALUE),
    projects: projects.map((project) => project.value).filter((id) => id !== ALL_VALUE),
    tags: tags.map((tag) => tag.value).filter((id) => id !== ALL_VALUE),
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup direction="column" gutterSize="l">
        <FieldSelector
          required
          allowAllOption
          label={i18n.translate('xpack.slo.sloEdit.syntheticsAvailability.monitor', {
            defaultMessage: 'Monitor name',
          })}
          placeholder={i18n.translate(
            'xpack.slo.sloEdit.syntheticsAvailability.monitor.placeholder',
            { defaultMessage: 'Select the Synthetics monitor or choose all' }
          )}
          fieldName="monitorIds"
          name="indicator.params.monitorIds"
          filters={filters}
          dataTestSubj="syntheticsAvailabilityMonitorSelector"
          tooltip={
            <EuiIconTip
              content={i18n.translate('xpack.slo.sloEdit.syntheticsAvailability.monitor.tooltip', {
                defaultMessage:
                  'This is the monitor or monitors part of this SLO. Select "*" to group by project, tag, or location',
              })}
              position="top"
            />
          }
        />
        <FieldSelector
          allowAllOption
          label={i18n.translate('xpack.slo.sloEdit.syntheticsAvailability.project', {
            defaultMessage: 'Project',
          })}
          placeholder={i18n.translate(
            'xpack.slo.sloEdit.syntheticsAvailability.project.placeholder',
            {
              defaultMessage: 'Select the project',
            }
          )}
          fieldName="projects"
          name="indicator.params.projects"
          filters={filters}
          dataTestSubj="syntheticsAvailabilityProjectSelector"
        />
        <FieldSelector
          label={i18n.translate('xpack.slo.sloEdit.syntheticsAvailability.tags', {
            defaultMessage: 'Tags',
          })}
          placeholder={i18n.translate('xpack.slo.sloEdit.syntheticsAvailability.tags.placeholder', {
            defaultMessage: 'Select tags',
          })}
          fieldName="tags"
          name="indicator.params.tags"
          filters={filters}
          dataTestSubj="syntheticsAvailabilityTagsSelector"
        />
      </EuiFlexGroup>

      <EuiFlexGroup direction="row" gutterSize="l">
        <EuiFlexItem>
          <QueryBuilder
            dataTestSubj="syntheticsAvailabilityFilterInput"
            indexPatternString={index}
            label={i18n.translate('xpack.slo.sloEdit.syntheticsAvailability.filter', {
              defaultMessage: 'Query filter',
            })}
            name="indicator.params.filter"
            placeholder={i18n.translate(
              'xpack.slo.sloEdit.syntheticsAvailability.filter.placeholder',
              {
                defaultMessage: 'Custom filter to apply on the index',
              }
            )}
            tooltip={
              <EuiIconTip
                content={i18n.translate('xpack.slo.sloEdit.synthetics.filter.tooltip', {
                  defaultMessage:
                    'This KQL query is used to filter the Synthetics checks on some relevant criteria for this SLO.',
                })}
                position="top"
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiCallOut
        size="s"
        title="Synthetics availability SLIs are automatically grouped by monitor and location"
        iconType="iInCircle"
      />
      <DataPreviewChart range={range} label={LABEL} useGoodBadEventsChart />
    </EuiFlexGroup>
  );
}

const LABEL = i18n.translate('xpack.slo.sloEdit.dataPreviewChart.syntheticsAvailability.xTitle', {
  defaultMessage: 'Last 24 hours',
});
