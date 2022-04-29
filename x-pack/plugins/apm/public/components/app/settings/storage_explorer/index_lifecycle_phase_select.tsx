/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IndexLifecyclePhase } from '../../../../../common/storage_explorer_types';

interface Props {
  indexLifecyclePhase: IndexLifecyclePhase;
  onChange: (indexLifecyclePhase: IndexLifecyclePhase) => void;
}

export function IndexLifecyclePhaseSelect({
  indexLifecyclePhase,
  onChange,
}: Props) {
  const options: Array<{
    value: IndexLifecyclePhase;
    text: string;
  }> = [
    {
      value: IndexLifecyclePhase.Hot,
      text: i18n.translate(
        'xpack.apm.settings.storageExplorer.indexLifecyclePhase.hot',
        {
          defaultMessage: 'Hot',
        }
      ),
    },
    {
      value: IndexLifecyclePhase.Warm,
      text: i18n.translate(
        'xpack.apm.settings.storageExplorer.indexLifecyclePhase.warm',
        {
          defaultMessage: 'Warm',
        }
      ),
    },
    {
      value: IndexLifecyclePhase.Cold,
      text: i18n.translate(
        'xpack.apm.settings.storageExplorer.indexLifecyclePhase.cold',
        {
          defaultMessage: 'Cold',
        }
      ),
    },
    {
      value: IndexLifecyclePhase.Frozen,
      text: i18n.translate(
        'xpack.apm.settings.storageExplorer.indexLifecyclePhase.frozen',
        {
          defaultMessage: 'Frozen',
        }
      ),
    },
  ];

  return (
    <EuiSelect
      prepend={i18n.translate(
        'xpack.apm.settings.storageExplorer.indexLifecyclePhase.label',
        {
          defaultMessage: 'Index lifecycle phase',
        }
      )}
      options={options}
      value={indexLifecyclePhase}
      onChange={(e) => onChange(e.target.value as IndexLifecyclePhase)}
      style={{ minWidth: 200 }}
    />
  );
}
