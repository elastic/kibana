/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiPopover, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StatefulTopN } from '../../top_n';
import { TimelineId } from '../../../../../common/types/timeline';
import { SourcererScopeName } from '../../../store/sourcerer/model';
import { useSourcererScope } from '../../../containers/sourcerer';
import { TooltipWithKeyboardShortcut } from '../../accessibility';
import { getAdditionalScreenReaderOnlyContext } from '../utils';
import { SHOW_TOP_N_KEYBOARD_SHORTCUT } from '../keyboard_shortcut_constants';

const SHOW_TOP = (fieldName: string) =>
  i18n.translate('xpack.securitySolution.hoverActions.showTopTooltip', {
    values: { fieldName },
    defaultMessage: `Show top {fieldName}`,
  });

interface Props {
  field: string;
  onClick: () => void;
  onFilterAdded?: () => void;
  ownFocus: boolean;
  showTopN: boolean;
  timelineId?: string | null;
  value?: string[] | string | null;
}

export const ShowTopNButton: React.FC<Props> = React.memo(
  ({ field, onClick, onFilterAdded, ownFocus, showTopN, timelineId, value }) => {
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
    const button = (
      <EuiButtonIcon
        aria-label={SHOW_TOP(field)}
        className="securitySolution__hoverActionButton"
        data-test-subj="show-top-field"
        iconSize="s"
        iconType="visBarVertical"
        onClick={onClick}
      />
    );
    return showTopN ? (
      <EuiPopover button={button} isOpen={showTopN} closePopover={onClick}>
        <StatefulTopN
          browserFields={browserFields}
          field={field}
          indexPattern={indexPattern}
          onFilterAdded={onFilterAdded}
          timelineId={timelineId ?? undefined}
          toggleTopN={onClick}
          value={value}
        />
      </EuiPopover>
    ) : (
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
        <EuiButtonIcon
          aria-label={SHOW_TOP(field)}
          className="securitySolution__hoverActionButton"
          data-test-subj="show-top-field"
          iconSize="s"
          iconType="visBarVertical"
          onClick={onClick}
        />
      </EuiToolTip>
    );
  }
);

ShowTopNButton.displayName = 'ShowTopNButton';
