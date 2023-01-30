/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { type DataView } from '@kbn/data-plugin/common';
import { type FieldStatsServices } from '@kbn/unified-field-list-plugin/public';
import { TimeRangeMs } from './field_stats_content';
import { MLJobWizardFieldStatsFlyoutContext } from './use_field_stats_flytout_context';
import { FieldStatsFlyout } from './field_stats_flyout';

export const FieldStatsFlyoutProvider = ({
  dataView,
  fieldStatsServices,
  timeRangeMs,
  children,
}: {
  children: React.ReactElement;
  fieldStatsServices: FieldStatsServices;
  timeRangeMs?: TimeRangeMs;

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
      <FieldStatsFlyout
        dataView={dataView}
        fieldStatsServices={fieldStatsServices}
        timeRangeMs={timeRangeMs}
      />
      {children}
    </MLJobWizardFieldStatsFlyoutContext.Provider>
  );
};
