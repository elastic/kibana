/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import classNames from 'classnames';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

export interface Props {
  isVisible: boolean;
  isDisabled: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  'data-test-subj'?: string;
}

const moveHereLabel = i18n.translate(
  'xpack.ingestPipelines.pipelineEditor.dropZoneButton.moveHereToolTip',
  {
    defaultMessage: 'Move here',
  }
);

const cannotMoveHereLabel = i18n.translate(
  'xpack.ingestPipelines.pipelineEditor.dropZoneButton.unavailableToolTip',
  { defaultMessage: 'Cannot move here' }
);

export const DropZoneButton: FunctionComponent<Props> = (props) => {
  const { onClick, isDisabled, isVisible } = props;
  const isUnavailable = isVisible && isDisabled;
  const containerClasses = classNames({
    'pipelineProcessorsEditor__tree__dropZoneContainer--visible': isVisible,
    'pipelineProcessorsEditor__tree__dropZoneContainer--unavailable': isUnavailable,
  });
  const buttonClasses = classNames({
    'pipelineProcessorsEditor__tree__dropZoneButton--visible': isVisible,
    'pipelineProcessorsEditor__tree__dropZoneButton--unavailable': isUnavailable,
  });

  const content = (
    <div className={`pipelineProcessorsEditor__tree__dropZoneContainer ${containerClasses}`}>
      <EuiButtonIcon
        data-test-subj={props['data-test-subj']}
        className={`pipelineProcessorsEditor__tree__dropZoneButton ${buttonClasses}`}
        aria-label={moveHereLabel}
        // We artificially disable the button so that hover and pointer events are
        // still enabled
        onClick={isDisabled ? () => {} : onClick}
        iconType="empty"
      />
    </div>
  );

  return isUnavailable ? (
    <EuiToolTip
      className="pipelineProcessorsEditor__tree__dropZoneContainer__toolTip"
      content={cannotMoveHereLabel}
    >
      {content}
    </EuiToolTip>
  ) : (
    content
  );
};
