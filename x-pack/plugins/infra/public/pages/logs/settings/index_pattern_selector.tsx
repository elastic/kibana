/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { IndexPattern } from '../../../../../../../src/plugins/data/common';

export const IndexPatternSelector: React.FC<{
  availableIndexPatterns: IndexPattern[];
  isLoading: boolean;
  isReadOnly: boolean;
}> = ({ isLoading, isReadOnly }) => {
  const availableOptions: EuiComboBoxOptionOption[] = useMemo(() => [], []);

  return (
    <EuiComboBox
      isLoading={isLoading}
      isDisabled={isReadOnly}
      options={availableOptions}
      placeholder={indexPatternSelectorPlaceholder}
      singleSelection={plainTextSingleSelection}
    />
  );
};

const plainTextSingleSelection = {
  asPlainText: true,
};

const indexPatternSelectorPlaceholder = i18n.translate(
  'xpack.infra.logSourceConfiguration.indexPatternSelectorPlaceholder',
  { defaultMessage: 'Choose an index pattern' }
);
