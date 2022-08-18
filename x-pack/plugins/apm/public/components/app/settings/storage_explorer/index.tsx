/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IndexLifecyclePhaseSelectOption } from '../../../../../common/storage_explorer_types';
import { IndexLifecyclePhaseSelect } from './index_lifecycle_phase_select';
import { ApmDatePicker } from '../../../shared/date_picker/apm_date_picker';
import { ApmEnvironmentFilter } from '../../../shared/environment_filter';
import { KueryBar } from '../../../shared/kuery_bar';
import { BetaBadge } from '../../../shared/beta_badge';
import { ServicesTable } from './services_table';

export function StorageExplorer() {
  const [indexLifecyclePhase, setIndexLifecyclePhase] = useState(
    IndexLifecyclePhaseSelectOption.Hot
  );

  return (
    <>
      <EuiFlexGroup justifyContent="flexStart" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.apm.settings.storageExplorer.title', {
                defaultMessage: 'Storage explorer',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <BetaBadge />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule />

      <EuiFlexGroup>
        <EuiFlexItem grow={5}>
          <KueryBar />,
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <ApmDatePicker />,
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <ApmEnvironmentFilter />,
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <IndexLifecyclePhaseSelect
            indexLifecyclePhase={indexLifecyclePhase}
            onChange={setIndexLifecyclePhase}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <ServicesTable indexLifecyclePhase={indexLifecyclePhase} />
    </>
  );
}
