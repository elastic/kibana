/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiIconTip, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SyntheticsAvailabilityIndicator } from '@kbn/slo-schema';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { CreateSLOForm } from '../../types';
import { FieldSelector } from '../synthetics_common/field_selector';
import { DataPreviewChart } from '../common/data_preview_chart';

export function SyntheticsAvailabilityIndicatorTypeForm() {
  const { watch } = useFormContext<CreateSLOForm<SyntheticsAvailabilityIndicator>>();
  const [monitorIds = [], projects = [], tags = []] = watch([
    'indicator.params.monitorIds',
    'indicator.params.projects',
    'indicator.params.tags',
  ]);

  const filters = {
    monitorIds: monitorIds.map((id) => id.value).filter((id) => id !== '*'),
    projects: projects.map((project) => project.value).filter((id) => id !== '*'),
    tags: tags.map((tag) => tag.value).filter((id) => id !== '*'),
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup direction="column" gutterSize="l">
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
      </EuiFlexGroup>

      <EuiCallOut
        size="s"
        title="Synthetics availability SLIs are automatically partitioned by monitor and location"
        iconType="iInCircle"
      />
      <DataPreviewChart />
    </EuiFlexGroup>
  );
}
