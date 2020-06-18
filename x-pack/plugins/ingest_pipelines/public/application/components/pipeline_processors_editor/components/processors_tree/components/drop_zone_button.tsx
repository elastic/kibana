/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import classNames from 'classnames';
import { EuiButtonIcon, EuiFlexItem } from '@elastic/eui';

export interface Props {
  isDisabled: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

const MOVE_HERE_LABEL = i18n.translate('xpack.ingestPipelines.pipelineEditor.moveTargetLabel', {
  defaultMessage: 'Move here',
});

export const DropZoneButton: FunctionComponent<Props> = ({ onClick, isDisabled }) => {
  const containerClasses = classNames({
    'pipelineProcessorsEditor__tree__dropZoneContainer--active': !isDisabled,
  });
  const buttonClasses = classNames({
    'pipelineProcessorsEditor__tree__dropZoneButton--active': !isDisabled,
  });

  return (
    <EuiFlexItem
      className={`pipelineProcessorsEditor__tree__dropZoneContainer ${containerClasses}`}
    >
      <EuiButtonIcon
        className={`pipelineProcessorsEditor__tree__dropZoneButton ${buttonClasses}`}
        aria-label={MOVE_HERE_LABEL}
        disabled={isDisabled}
        onClick={onClick}
        iconType="empty"
      />
    </EuiFlexItem>
  );
};
