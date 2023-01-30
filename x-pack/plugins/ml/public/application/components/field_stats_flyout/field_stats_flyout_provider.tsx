/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { type DataView } from '@kbn/data-plugin/common';
import { type FieldStatsServices } from '@kbn/unified-field-list-plugin/public';
import { MLJobWizardFieldStatsFlyoutContext } from './use_field_stats_flytout_context';
import { FieldStatsFlyout } from './field_stats_flyout';

export const FieldStatsFlyoutProvider = ({
  dataView,
  fieldStatsServices,
  children,
}: {
  children: React.ReactElement;
  fieldStatsServices: FieldStatsServices;
  dataView: DataView;
}) => {
  const [isFieldStatsFlyoutVisible, setFieldStatsIsFlyoutVisible] = useState(false);
  const [fieldName, setFieldName] = useState<string | undefined>();
  const [fieldValue, setFieldValue] = useState<string | number | undefined>();

  const toggleFieldStatsFlyoutVisible = useCallback(
    () => setFieldStatsIsFlyoutVisible(!isFieldStatsFlyoutVisible),
    [isFieldStatsFlyoutVisible]
  );

  return (
    <MLJobWizardFieldStatsFlyoutContext.Provider
      value={{
        isFlyoutVisible: isFieldStatsFlyoutVisible,
        setIsFlyoutVisible: setFieldStatsIsFlyoutVisible,
        toggleFlyoutVisible: toggleFieldStatsFlyoutVisible,
        setFieldName,
        fieldName,
        setFieldValue,
        fieldValue,
      }}
    >
      <FieldStatsFlyout dataView={dataView} fieldStatsServices={fieldStatsServices} />
      {children}
    </MLJobWizardFieldStatsFlyoutContext.Provider>
  );
};
