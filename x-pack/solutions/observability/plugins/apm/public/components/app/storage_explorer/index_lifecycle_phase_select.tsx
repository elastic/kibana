/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { IndexLifecyclePhaseSelectOption } from '../../../../common/storage_explorer_types';
import * as urlHelpers from '../../shared/links/url_helpers';
import { useApmParams } from '../../../hooks/use_apm_params';

export function IndexLifecyclePhaseSelect() {
  const history = useHistory();

  const {
    query: { indexLifecyclePhase },
  } = useApmParams('/storage-explorer');

  const options = [
    {
      value: IndexLifecyclePhaseSelectOption.All,
      label: i18n.translate('xpack.apm.storageExplorer.indexLifecyclePhase.all.label', {
        defaultMessage: 'All',
      }),
      description: i18n.translate('xpack.apm.storageExplorer.indexLifecyclePhase.all.description', {
        defaultMessage: 'Search data in all lifecycle phases.',
      }),
    },
    {
      value: IndexLifecyclePhaseSelectOption.Hot,
      label: i18n.translate('xpack.apm.storageExplorer.indexLifecyclePhase.hot.label', {
        defaultMessage: 'Hot',
      }),
      description: i18n.translate('xpack.apm.storageExplorer.indexLifecyclePhase.hot.description', {
        defaultMessage: 'Holds your most-recent, most-frequently-searched data.',
      }),
    },
    {
      value: IndexLifecyclePhaseSelectOption.Warm,
      label: i18n.translate('xpack.apm.storageExplorer.indexLifecyclePhase.warm.label', {
        defaultMessage: 'Warm',
      }),
      description: i18n.translate(
        'xpack.apm.storageExplorer.indexLifecyclePhase.warm.description',
        {
          defaultMessage:
            'Holds data from recent weeks. Updates are still allowed, but likely infrequent.',
        }
      ),
    },
    {
      value: IndexLifecyclePhaseSelectOption.Cold,
      label: i18n.translate('xpack.apm.storageExplorer.indexLifecyclePhase.cold.label', {
        defaultMessage: 'Cold',
      }),
      description: i18n.translate(
        'xpack.apm.storageExplorer.indexLifecyclePhase.cold.description',
        {
          defaultMessage:
            'While still searchable, this tier is typically optimized for lower storage costs rather than search speed.',
        }
      ),
    },
    {
      value: IndexLifecyclePhaseSelectOption.Frozen,
      label: i18n.translate('xpack.apm.storageExplorer.indexLifecyclePhase.frozen.label', {
        defaultMessage: 'Frozen',
      }),
      description: i18n.translate(
        'xpack.apm.storageExplorer.indexLifecyclePhase.frozen.description',
        {
          defaultMessage: 'Holds data that are no longer being queried, or being queried rarely.',
        }
      ),
    },
  ].map(({ value, label, description }) => ({
    value,
    inputDisplay: label,
    dropdownDisplay: (
      <>
        <strong>{label}</strong>
        <EuiText size="s" color="subdued">
          <p>{description}</p>
        </EuiText>
      </>
    ),
  }));

  return (
    <EuiSuperSelect
      prepend={i18n.translate('xpack.apm.storageExplorer.indexLifecyclePhase.label', {
        defaultMessage: 'Index lifecycle phase',
      })}
      options={options}
      valueOfSelected={indexLifecyclePhase}
      onChange={(value) => {
        urlHelpers.push(history, {
          query: { indexLifecyclePhase: value },
        });
      }}
      hasDividers
      style={{ minWidth: 200 }}
      data-test-subj="storageExplorerLifecyclePhaseSelect"
    />
  );
}
