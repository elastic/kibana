/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiFieldText, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DELETE_BUTTON_LABEL } from '../../../../../shared/constants';

interface Props {
  queryValue: string;
  onChange(newValue: string): void;
  onDelete(): void;
  disableDelete: boolean;
}

export const CurationQuery: React.FC<Props> = ({
  queryValue,
  onChange,
  onDelete,
  disableDelete,
}) => (
  <EuiFlexGroup className="curationQueryRow" alignItems="center" responsive={false} gutterSize="s">
    <EuiFlexItem>
      <EuiFieldText
        fullWidth
        placeholder={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.curations.queryPlaceholder',
          { defaultMessage: 'Enter a query' }
        )}
        value={queryValue}
        onChange={(e) => onChange(e.target.value)}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="trash"
        color="danger"
        onClick={onDelete}
        isDisabled={disableDelete}
        aria-label={DELETE_BUTTON_LABEL}
        data-test-subj="deleteCurationQueryButton"
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
