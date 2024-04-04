/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { EuiDataGridCellProps } from '@elastic/eui';
import React, { useMemo, memo } from 'react';
import { find, getOr } from 'lodash/fp';
import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import { tableDefaults, dataTableSelectors } from '@kbn/securitysolution-data-table';
import type { TableId } from '@kbn/securitysolution-data-table';
import { useLicense } from '../../../common/hooks/use_license';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import type { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { GuidedOnboardingTourStep } from '../../../common/components/guided_onboarding_tour/tour_step';
import { isDetectionsAlertsTable } from '../../../common/components/top_n/helpers';
import {
  AlertsCasesTourSteps,
  SecurityStepId,
} from '../../../common/components/guided_onboarding_tour/tour_config';
import { SIGNAL_RULE_NAME_FIELD_NAME } from '../../../timelines/components/timeline/body/renderers/constants';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';

import { SUPPRESSED_ALERT_TOOLTIP } from './translations';
import { VIEW_SELECTION } from '../../../../common/constants';
import { getAllFieldsByName } from '../../../common/containers/source';
import { eventRenderedViewColumns, getColumns } from './columns';

/**
 * This implementation of `EuiDataGrid`'s `renderCellValue`
 * accepts `EuiDataGridCellValueElementProps`, plus `data`
 * from the TGrid
 */

export const RenderCellValue: React.FC<EuiDataGridCellProps['cellContext']> = memo(
  function RenderCellValue(props) {
    const {
      columnId,
      rowIndex,
      scopeId,
      tableId,
      header,
      data,
      ecsData,
      linkValues,
      rowRenderers,
      isDetails,
      isDraggable,
      isExpandable,
      isExpanded,
      colIndex,
      eventId,
      setCellProps,
      truncate,
      context,
    } = props;
    const isTourAnchor = useMemo(
      () =>
        columnId === SIGNAL_RULE_NAME_FIELD_NAME &&
        isDetectionsAlertsTable(scopeId) &&
        rowIndex === 0 &&
        !props.isDetails,
      [columnId, props.isDetails, rowIndex, scopeId]
    );
    const { browserFields } = useSourcererDataView(scopeId);
    const browserFieldsByName = useMemo(() => getAllFieldsByName(browserFields), [browserFields]);
    const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);
    const license = useLicense();
    const viewMode =
      useDeepEqualSelector((state) => (getTable(state, tableId) ?? tableDefaults).viewMode) ??
      tableDefaults.viewMode;

    const gridColumns = useMemo(() => {
      return getColumns(license);
    }, [license]);

    const columnHeaders = useMemo(() => {
      return viewMode === VIEW_SELECTION.gridView ? gridColumns : eventRenderedViewColumns;
    }, [gridColumns, viewMode]);

    /**
     * There is difference between how `triggers actions` fetched data v/s
     * how security solution fetches data via timelineSearchStrategy
     *
     * _id and _index fields are array in timelineSearchStrategy  but not in
     * ruleStrategy
     *
     *
     */

    const finalData = useMemo(() => {
      return (data as TimelineNonEcsData[]).map((field) => {
        if (['_id', '_index'].includes(field.field)) {
          const newValue = field.value ?? '';
          return {
            field: field.field,
            value: Array.isArray(newValue) ? newValue : [newValue],
          };
        } else {
          return field;
        }
      });
    }, [data]);

    const actualSuppressionCount = useMemo(() => {
      // We check both ecsData and data for the suppression count because it could be in either one,
      // depending on where RenderCellValue is being used - when used in cases, data is populated,
      // whereas in the regular security alerts table it's in ecsData
      const ecsSuppressionCount = ecsData?.kibana?.alert.suppression?.docs_count?.[0];
      const dataSuppressionCount = find({ field: 'kibana.alert.suppression.docs_count' }, data)
        ?.value?.[0] as number | undefined;
      return ecsSuppressionCount ? parseInt(ecsSuppressionCount, 10) : dataSuppressionCount;
    }, [ecsData, data]);

    const Renderer = useMemo(() => {
      const myHeader = header ?? { id: columnId, ...browserFieldsByName[columnId] };
      const colHeader = columnHeaders.find((col) => col.id === columnId);
      const localLinkValues = getOr([], colHeader?.linkField ?? '', ecsData);
      return (
        <GuidedOnboardingTourStep
          isTourAnchor={isTourAnchor}
          step={AlertsCasesTourSteps.pointToAlertName}
          tourId={SecurityStepId.alertsCases}
        >
          <DefaultCellRenderer
            browserFields={browserFields}
            columnId={columnId}
            data={finalData}
            ecsData={ecsData}
            eventId={eventId}
            header={myHeader}
            isDetails={isDetails}
            isDraggable={isDraggable}
            isExpandable={isExpandable}
            isExpanded={isExpanded}
            linkValues={linkValues ?? localLinkValues}
            rowIndex={rowIndex}
            colIndex={colIndex}
            rowRenderers={rowRenderers ?? defaultRowRenderers}
            setCellProps={setCellProps}
            scopeId={tableId}
            truncate={truncate}
            asPlainText={false}
            context={context}
          />
        </GuidedOnboardingTourStep>
      );
    }, [
      isTourAnchor,
      finalData,
      browserFieldsByName,
      header,
      columnId,
      ecsData,
      linkValues,
      rowRenderers,
      isDetails,
      isDraggable,
      isExpandable,
      isExpanded,
      colIndex,
      eventId,
      setCellProps,
      truncate,
      context,
      tableId,
      browserFields,
      rowIndex,
      columnHeaders,
    ]);

    return columnId === SIGNAL_RULE_NAME_FIELD_NAME &&
      actualSuppressionCount &&
      actualSuppressionCount > 0 ? (
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" content={SUPPRESSED_ALERT_TOOLTIP(actualSuppressionCount)}>
            <EuiIcon type="layers" />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{Renderer}</EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      <GuidedOnboardingTourStep
        isTourAnchor={isTourAnchor}
        step={AlertsCasesTourSteps.pointToAlertName}
        tourId={SecurityStepId.alertsCases}
      >
        {Renderer}
      </GuidedOnboardingTourStep>
    );
  }
);

export const getRenderCellValueHook = ({
  scopeId,
  tableId,
}: {
  scopeId: SourcererScopeName;
  tableId: TableId;
}) => {
  const useRenderCellValue = (props: EuiDataGridCellProps['cellContext']) => {
    return <RenderCellValue {...props} scopeId={scopeId} tableId={tableId} />;
  };
  return useRenderCellValue;
};
