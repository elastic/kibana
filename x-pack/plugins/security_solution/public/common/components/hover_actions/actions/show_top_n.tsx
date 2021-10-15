/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StatefulTopN } from '../../top_n';
import { TimelineId } from '../../../../../common/types/timeline';
import { SourcererScopeName } from '../../../store/sourcerer/model';
import { useSourcererScope } from '../../../containers/sourcerer';
import { TooltipWithKeyboardShortcut } from '../../accessibility';
import { getAdditionalScreenReaderOnlyContext } from '../utils';
import { SHOW_TOP_N_KEYBOARD_SHORTCUT } from '../keyboard_shortcut_constants';
import { Filter } from '../../../../../../../../src/plugins/data/public';

const SHOW_TOP = (fieldName: string) =>
  i18n.translate('xpack.securitySolution.hoverActions.showTopTooltip', {
    values: { fieldName },
    defaultMessage: `Show top {fieldName}`,
  });

interface Props {
  /** When `Component` is used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality.
   * When `Component` is used with `EuiContextMenu`, we pass EuiContextMenuItem to render the right style.
   */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon | typeof EuiContextMenuItem;
  enablePopOver?: boolean;
  field: string;
  globalFilters?: Filter[];
  onClick: () => void;
  onFilterAdded?: () => void;
  ownFocus: boolean;
  showTooltip?: boolean;
  showTopN: boolean;
  timelineId?: string | null;
  value?: string[] | string | null;
}

export const ShowTopNButton: React.FC<Props> = React.memo(
  ({
    Component,
    enablePopOver,
    field,
    onClick,
    onFilterAdded,
    ownFocus,
    showTooltip = true,
    showTopN,
    timelineId,
    value,
    globalFilters,
  }) => {
    const activeScope: SourcererScopeName =
      timelineId === TimelineId.active
        ? SourcererScopeName.timeline
        : timelineId != null &&
          [TimelineId.detectionsPage, TimelineId.detectionsRulesDetailsPage].includes(
            timelineId as TimelineId
          )
        ? SourcererScopeName.detections
        : SourcererScopeName.default;
    const { browserFields, indexPattern } = useSourcererScope(activeScope);

    const basicButton = useMemo(
      () =>
        Component ? (
          <Component
            aria-label={SHOW_TOP(field)}
            data-test-subj="show-top-field"
            icon="visBarVertical"
            iconType="visBarVertical"
            onClick={onClick}
            title={SHOW_TOP(field)}
          >
            {SHOW_TOP(field)}
          </Component>
        ) : (
          <EuiButtonIcon
            aria-label={SHOW_TOP(field)}
            className="securitySolution__hoverActionButton"
            data-test-subj="show-top-field"
            iconSize="s"
            iconType="visBarVertical"
            onClick={onClick}
          />
        ),
      [Component, field, onClick]
    );

    const button = useMemo(
      () =>
        showTooltip && !showTopN ? (
          <EuiToolTip
            content={
              <TooltipWithKeyboardShortcut
                additionalScreenReaderOnlyContext={getAdditionalScreenReaderOnlyContext({
                  field,
                  value,
                })}
                content={SHOW_TOP(field)}
                shortcut={SHOW_TOP_N_KEYBOARD_SHORTCUT}
                showShortcut={ownFocus}
              />
            }
          >
            {basicButton}
          </EuiToolTip>
        ) : (
          basicButton
        ),
      [basicButton, field, ownFocus, showTooltip, showTopN, value]
    );

    const topNPannel = useMemo(
      () => (
        <StatefulTopN
          browserFields={browserFields}
          field={field}
          indexPattern={indexPattern}
          onFilterAdded={onFilterAdded}
          timelineId={timelineId ?? undefined}
          toggleTopN={onClick}
          value={value}
          globalFilters={globalFilters}
        />
      ),
      [browserFields, field, indexPattern, onClick, onFilterAdded, timelineId, value, globalFilters]
    );

    return showTopN ? (
      enablePopOver ? (
        <EuiPopover
          button={basicButton}
          isOpen={showTopN}
          closePopover={onClick}
          panelClassName="withHoverActions__popover"
          data-test-subj="showTopNContainer"
        >
          {topNPannel}
        </EuiPopover>
      ) : (
        topNPannel
      )
    ) : (
      button
    );
  }
);

ShowTopNButton.displayName = 'ShowTopNButton';
