/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { isDefined } from '@kbn/ml-is-defined';
import type {
  FieldStatsServices,
  FieldStatsProps,
} from '@kbn/unified-field-list/src/components/field_stats';
import {
  FieldPopover,
  FieldPopoverHeader,
} from '@kbn/unified-field-list/src/components/field_popover';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import { useEuiTheme } from '../../hooks/use_eui_theme';
import { FieldStatsContent } from './field_stats_content';

export function FieldStatsPopover({
  dataView,
  dslQuery,
  fieldName,
  fieldValue,
  fieldStatsServices,
  timeRangeMs,
}: {
  dataView: DataView;
  dslQuery?: FieldStatsProps['dslQuery'];
  fieldName: string;
  fieldValue: string | number;
  fieldStatsServices: FieldStatsServices;
  timeRangeMs?: TimeRangeMs;
}) {
  const [infoIsOpen, setInfoOpen] = useState(false);
  const euiTheme = useEuiTheme();

  const closePopover = useCallback(() => setInfoOpen(false), []);

  const fieldForStats = useMemo(
    () => (isDefined(fieldName) ? dataView.getFieldByName(fieldName) : undefined),
    [fieldName, dataView]
  );

  const trigger = (
    <EuiToolTip
      content={i18n.translate('xpack.aiops.fieldContextPopover.descriptionTooltipContent', {
        defaultMessage: 'Show top field values',
      })}
    >
      <EuiButtonIcon
        iconType="inspect"
        onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
          setInfoOpen(!infoIsOpen);
        }}
        aria-label={i18n.translate('xpack.aiops.fieldContextPopover.topFieldValuesAriaLabel', {
          defaultMessage: 'Show top field values',
        })}
        data-test-subj={'aiopsContextPopoverButton'}
        css={{ marginLeft: euiTheme.euiSizeXS }}
      />
    </EuiToolTip>
  );

  if (!fieldForStats) return null;

  return (
    <FieldPopover
      isOpen={infoIsOpen}
      closePopover={closePopover}
      button={trigger}
      renderHeader={() => <FieldPopoverHeader field={fieldForStats} closePopover={closePopover} />}
      renderContent={() => (
        <FieldStatsContent
          field={fieldForStats}
          fieldName={fieldName}
          fieldValue={fieldValue}
          dataView={dataView}
          fieldStatsServices={fieldStatsServices}
          timeRangeMs={timeRangeMs}
          dslQuery={dslQuery}
        />
      )}
    />
  );
}
