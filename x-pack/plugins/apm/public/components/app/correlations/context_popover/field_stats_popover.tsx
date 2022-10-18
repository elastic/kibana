/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  FieldPopover,
  FieldStats,
  FieldPopoverHeader,
  FieldStatsServices,
} from '@kbn/unified-field-list-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Filter } from '@kbn/es-query';
import { DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldTopValuesBucketParams } from '@kbn/unified-field-list-plugin/public';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useFetchParams } from '../use_fetch_params';
import { ApmPluginStartDeps } from '../../../../plugin';
import { useApmDataView } from '../../../../hooks/use_apm_data_view';
import { useTheme } from '../../../../hooks/use_theme';

export type OnAddFilter = ({
  fieldName,
  fieldValue,
  include,
}: {
  fieldName: string;
  fieldValue: string | number;
  include: boolean;
}) => void;

const defaultFilters: Filter[] = [];

export function FieldStatsPopover({
  fieldName,
  fieldValue,
  onAddFilter,
}: {
  fieldName: string;
  fieldValue: string | number;
  onAddFilter: OnAddFilter;
}) {
  const {
    query: { kuery: kueryStr },
  } = useApmParams('/services/{serviceName}');

  const { start, end } = useFetchParams();

  const {
    data,
    core: { uiSettings },
  } = useApmPluginContext();
  const { dataView } = useApmDataView();
  const {
    services: { fieldFormats, charts },
  } = useKibana<ApmPluginStartDeps>();

  const [infoIsOpen, setInfoOpen] = useState(false);
  const field = dataView?.getFieldByName(fieldName);

  const closePopover = useCallback(() => setInfoOpen(false), []);
  const theme = useTheme();

  const fieldStatsQuery = useMemo(
    () => ({
      query: kueryStr,
      language: 'kuery',
    }),
    [kueryStr]
  );

  const fieldStatsServices: Partial<FieldStatsServices> = useMemo(
    () => ({
      uiSettings,
      dataViews: data.dataViews,
      data,
      fieldFormats,
      charts,
    }),
    [uiSettings, data, fieldFormats, charts]
  );

  const addFilter = useCallback(
    (
      popoverField: DataViewField | '_exists_',
      value: unknown,
      type: '+' | '-'
    ) => {
      if (
        popoverField !== '_exists_' &&
        (typeof value === 'number' || typeof value === 'string')
      ) {
        onAddFilter({
          fieldName: popoverField.name,
          fieldValue: value,
          include: type === '+',
        });
      }
    },
    [onAddFilter]
  );

  const overrideFieldTopValueBar = useCallback(
    (fieldTopValuesBucketParams: FieldTopValuesBucketParams) => {
      if (fieldTopValuesBucketParams.type === 'other') {
        return { color: 'primary' };
      }
      return fieldValue === fieldTopValuesBucketParams.fieldValue
        ? { color: 'accent' }
        : {};
    },
    [fieldValue]
  );

  if (!fieldFormats || !charts || !field || !dataView) return null;

  const trigger = (
    <EuiToolTip
      content={i18n.translate(
        'xpack.apm.correlations.fieldContextPopover.descriptionTooltipContent',
        {
          defaultMessage: 'Show top 10 field values',
        }
      )}
    >
      <EuiButtonIcon
        iconType="inspect"
        onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
          setInfoOpen(!infoIsOpen);
        }}
        aria-label={i18n.translate(
          'xpack.apm.correlations.fieldContextPopover.topFieldValuesAriaLabel',
          {
            defaultMessage: 'Show top 10 field values',
          }
        )}
        data-test-subj={'apmCorrelationsContextPopoverButton'}
        style={{ marginLeft: theme.eui.euiSizeXS }}
      />
    </EuiToolTip>
  );

  return (
    <FieldPopover
      isOpen={infoIsOpen}
      closePopover={closePopover}
      button={trigger}
      renderHeader={() => (
        <FieldPopoverHeader field={field} closePopover={closePopover} />
      )}
      renderContent={() => (
        <>
          <FieldStats
            services={fieldStatsServices as FieldStatsServices}
            field={field}
            dataViewOrDataViewId={dataView}
            query={fieldStatsQuery}
            filters={defaultFilters}
            fromDate={start}
            toDate={end}
            onAddFilter={addFilter}
            overrideFieldTopValueBar={overrideFieldTopValueBar}
          />
        </>
      )}
    />
  );
}
