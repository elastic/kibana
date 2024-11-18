/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiCheckbox,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiIconTip,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { CreateSLOForm } from '../../../types';

export function AdvancedSettings() {
  const { control, getFieldState } = useFormContext<CreateSLOForm>();
  const preventBackfillCheckbox = useGeneratedHtmlId({ prefix: 'preventBackfill' });
  const advancedSettingsAccordion = useGeneratedHtmlId({ prefix: 'advancedSettingsAccordion' });

  return (
    <EuiAccordion
      paddingSize="s"
      id={advancedSettingsAccordion}
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="controlsVertical" size="m" />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('xpack.slo.sloEdit.settings.advancedSettingsLabel', {
                  defaultMessage: 'Advanced settings',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiFlexGrid columns={3}>
        <EuiFlexItem>
          <EuiFormRow isInvalid={getFieldState('settings.preventInitialBackfill').invalid}>
            <Controller
              name="settings.preventInitialBackfill"
              control={control}
              render={({ field: { ref, onChange, ...field } }) => (
                <EuiCheckbox
                  id={preventBackfillCheckbox}
                  label={
                    <span>
                      {i18n.translate('xpack.slo.sloEdit.settings.preventInitialBackfill.label', {
                        defaultMessage: 'Prevent initial backfill of data',
                      })}
                      <EuiIconTip
                        content={i18n.translate(
                          'xpack.slo.sloEdit.settings.preventInitialBackfill.tooltip',
                          {
                            defaultMessage:
                              'Start aggregating data from the time the SLO is created, instead of backfilling data from the beginning of the time window.',
                          }
                        )}
                        position="top"
                      />
                    </span>
                  }
                  checked={Boolean(field.value)}
                  onChange={(event: any) => onChange(event.target.checked)}
                />
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiAccordion>
  );
}
