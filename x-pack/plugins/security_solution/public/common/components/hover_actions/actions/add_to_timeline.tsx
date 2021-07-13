/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TooltipWithKeyboardShortcut } from '../../accessibility';
import { getAdditionalScreenReaderOnlyContext } from '../utils';
import { ADD_TO_TIMELINE_KEYBOARD_SHORTCUT } from '../keyboard_shortcut_constants';

const ADD_TO_TIMELINE = i18n.translate('xpack.securitySolution.hoverActions.addToTimeline', {
  defaultMessage: 'Add to timeline investigation',
});
interface Props {
  field: string;
  onClick: () => void;
  ownFocus: boolean;
  value?: string[] | string | null;
}

export const AddToTimelineButton: React.FC<Props> = React.memo(
  ({ field, onClick, ownFocus, value }) => {
    return (
      <EuiToolTip
        content={
          <TooltipWithKeyboardShortcut
            additionalScreenReaderOnlyContext={getAdditionalScreenReaderOnlyContext({
              field,
              value,
            })}
            content={ADD_TO_TIMELINE}
            shortcut={ADD_TO_TIMELINE_KEYBOARD_SHORTCUT}
            showShortcut={ownFocus}
          />
        }
      >
        <EuiButtonIcon
          aria-label={ADD_TO_TIMELINE}
          className="securitySolution__hoverActionButton"
          data-test-subj="add-to-timeline"
          iconSize="s"
          iconType="timeline"
          onClick={onClick}
        />
      </EuiToolTip>
    );
  }
);

AddToTimelineButton.displayName = 'AddToTimelineButton';
