/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SloListItems } from './slo_list_items';

import { useFetchSloList } from '../../hooks/slo/use_fetch_slo_list';
import { SloSelector } from '../../components/burn_rate_rule_editor/slo_selector';

export interface SloConfigurationProps {
  onCreate: (props: any) => void;
  onCancel: () => void;
}

export function SloConfiguration({ onCreate, onCancel }) {
  const [selectedSlo, setSelectedSlo] = useState(undefined);
  const { isLoading, isRefetching, isError, sloList } = useFetchSloList();
  const { results = [] } = sloList || {};
  return (
    <EuiModal onClose={() => {}}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>SLO configuration</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup>
          <EuiFlexItem grow>
            <SloSelector
              onSelected={(slo) => {
                console.log(slo, '!!aaaaa slo');
                setSelectedSlo(slo);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="sloCancelButton">
          <FormattedMessage
            id="xpack.aiops.embeddableChangePointChart.setupModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="sloConfirmButton"
          onClick={onCreate.bind(null, selectedSlo)}
          fill
        >
          <FormattedMessage
            id="xpack.observability.embeddableSlo.setupModal.confirmButtonLabel"
            defaultMessage="Confirm configurations"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
