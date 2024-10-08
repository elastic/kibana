/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FieldSelector } from './field_selector';

export function MonitorFiltersForm() {
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup direction="column" gutterSize="l">
        <FieldSelector
          label={i18n.translate('xpack.synthetics.monitorEdit.syntheticsAvailability.monitor', {
            defaultMessage: 'Monitor name',
          })}
          placeholder={i18n.translate(
            'xpack.synthetics.monitorEdit.syntheticsAvailability.monitor.placeholder',
            { defaultMessage: 'Select the Synthetics monitor or choose all' }
          )}
          name="monitorIds"
          dataTestSubj="syntheticsAvailabilityMonitorSelector"
          tooltip={
            <EuiIconTip
              content={i18n.translate(
                'xpack.synthetics.monitorEdit.syntheticsAvailability.monitor.tooltip',
                {
                  defaultMessage:
                    'This is the monitor or monitors part of this monitor. Select "*" to group by project, tag, or location',
                }
              )}
              position="top"
            />
          }
        />
        <FieldSelector
          label={i18n.translate('xpack.synthetics.monitorEdit.syntheticsAvailability.tags', {
            defaultMessage: 'Tags',
          })}
          placeholder={i18n.translate(
            'xpack.synthetics.monitorEdit.syntheticsAvailability.tags.placeholder',
            {
              defaultMessage: 'Select tags',
            }
          )}
          name="tags"
          dataTestSubj="syntheticsAvailabilityTagsSelector"
        />
        <FieldSelector
          label={i18n.translate('xpack.synthetics.monitorEdit.syntheticsAvailability.location', {
            defaultMessage: 'Locations',
          })}
          placeholder={i18n.translate(
            'xpack.synthetics.monitorEdit.syntheticsAvailability.location.placeholder',
            {
              defaultMessage: 'Select the locations',
            }
          )}
          name="locations"
          dataTestSubj="syntheticsAvailabilityLocationSelector"
        />
        <FieldSelector
          label={i18n.translate('xpack.synthetics.monitorEdit.syntheticsAvailability.project', {
            defaultMessage: 'Project',
          })}
          placeholder={i18n.translate(
            'xpack.synthetics.monitorEdit.syntheticsAvailability.project.placeholder',
            {
              defaultMessage: 'Select the project',
            }
          )}
          name="projects"
          dataTestSubj="syntheticsAvailabilityProjectSelector"
        />
        <FieldSelector
          label={i18n.translate('xpack.synthetics.monitorEdit.syntheticsAvailability.type', {
            defaultMessage: 'Monitor type',
          })}
          placeholder={i18n.translate(
            'xpack.synthetics.monitorEdit.syntheticsAvailability.type.placeholder',
            {
              defaultMessage: 'Select the monitor type',
            }
          )}
          name="monitorTypes"
          dataTestSubj="syntheticsAvailabilityProjectSelector"
        />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
