/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, useState } from 'react';
import {
  EuiAvatar,
  EuiButton,
  EuiFormLabel,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTimeline,
  EuiTimelineItem,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';

import { useKibana } from '../../../utils/kibana_react';
import { useCreateSlo } from '../../../hooks/slo/use_create_slo';
import { SloEditFormDefinitionCustomKql } from './slo_edit_form_definition_custom_kql';
import { SloEditFormDescription } from './slo_edit_form_description';
import { SloEditFormObjectives } from './slo_edit_form_objectives';
import { SLO } from '../../../typings';

export interface SloEditFormProps {
  slo: SLO | undefined;
}

export type SliType =
  | 'sli.apm.transaction_error_rate'
  | 'sli.apm.transaction_duration'
  | 'sli.kql.custom';

const SLI_OPTIONS: Array<{ value: SliType; text: string }> = [
  { value: 'sli.kql.custom', text: 'KQL custom indicator' },
];

const maxWidth = 775;

export function SloEditForm({ slo }: SloEditFormProps) {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const [stateSlo, setStateSlo] = useState<SLO | undefined>(slo);
  const [validity, setValidity] = useState({
    definition: false,
    objectives: false,
    description: false,
  });

  const { loading, error: errorCreatingSlo, createSlo } = useCreateSlo();

  const [sliType, setSliType] = useState<SliType>(SLI_OPTIONS[0].value);
  const sliSelectId = useGeneratedHtmlId({ prefix: 'sliSelect' });

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSliType(e.target.value as SliType);
  };

  const handleCreateSlo = () => {
    if (stateSlo) {
      createSlo(stateSlo);
    }
  };

  const handleCheckValidity = (valid: boolean) => {
    if (!validity.definition && valid) {
      setValidity({ ...validity, definition: true });
    }

    if (validity.definition && !valid) {
      setValidity({ ...validity, definition: false });
    }
  };

  if (errorCreatingSlo) {
    toasts.addError(new Error(errorCreatingSlo), { title: 'Something went wrong' });
  }

  return (
    <EuiTimeline>
      <EuiTimelineItem
        verticalAlign="top"
        icon={
          <EuiAvatar
            name={validity.definition ? 'Check' : '1'}
            iconType={validity.definition ? 'check' : ''}
            color={
              validity.definition ? euiThemeVars.euiColorSuccess : euiThemeVars.euiColorPrimary
            }
          />
        }
      >
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none" style={{ maxWidth }}>
          <EuiTitle>
            <h2>
              {i18n.translate('xpack.observability.slos.sloEdit.definition.title', {
                defaultMessage: 'Define SLI',
              })}
            </h2>
          </EuiTitle>

          <EuiSpacer size="xl" />

          <EuiFormLabel>
            {i18n.translate('xpack.observability.slos.sloEdit.definition.sliType', {
              defaultMessage: 'SLI type',
            })}
          </EuiFormLabel>
          <EuiSelect
            id={sliSelectId}
            options={SLI_OPTIONS}
            value={sliType}
            onChange={handleChange}
          />

          <EuiSpacer size="xxl" />

          {sliType === 'sli.kql.custom' ? (
            <SloEditFormDefinitionCustomKql onCheckValidity={handleCheckValidity} />
          ) : null}

          <EuiSpacer size="m" />
        </EuiPanel>
      </EuiTimelineItem>

      <EuiTimelineItem
        verticalAlign="top"
        icon={
          <EuiAvatar
            name={validity.objectives ? 'Check' : '2'}
            iconType={validity.objectives ? 'check' : ''}
            color={
              validity.objectives ? euiThemeVars.euiColorSuccess : euiThemeVars.euiColorPrimary
            }
          />
        }
      >
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none" style={{ maxWidth }}>
          <EuiTitle>
            <h2>
              {i18n.translate('xpack.observability.slos.sloEdit.objectives.title', {
                defaultMessage: 'Set objectives',
              })}
            </h2>
          </EuiTitle>

          <EuiSpacer size="xl" />

          <SloEditFormObjectives />

          <EuiSpacer size="xl" />
        </EuiPanel>
      </EuiTimelineItem>

      <EuiTimelineItem
        verticalAlign="top"
        icon={
          <EuiAvatar
            name={validity.description ? 'Check' : '3'}
            iconType={validity.description ? 'check' : ''}
            color={
              validity.description ? euiThemeVars.euiColorSuccess : euiThemeVars.euiColorPrimary
            }
          />
        }
      >
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none" style={{ maxWidth }}>
          <EuiTitle>
            <h2>
              {i18n.translate('xpack.observability.slos.sloEdit.description.title', {
                defaultMessage: 'Describe SLO',
              })}
            </h2>
          </EuiTitle>

          <EuiSpacer size="xl" />

          <SloEditFormDescription />

          <EuiSpacer size="xl" />

          <EuiButton
            fill
            color="primary"
            onClick={handleCreateSlo}
            isLoading={loading && !errorCreatingSlo}
          >
            {i18n.translate('xpack.observability.slos.sloEdit.createSloButton', {
              defaultMessage: 'Create SLO',
            })}
          </EuiButton>
        </EuiPanel>
      </EuiTimelineItem>
    </EuiTimeline>
  );
}
