/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import classNames from 'classnames';
import { EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';

export interface Props {
  isDisabled: boolean;
  onClick: () => void;
}

const MOVE_HERE_COPY = i18n.translate('xpack.ingestPipelines.pipelineEditor.moveTargetLabel', {
  defaultMessage: 'Move here',
});

export const DropZoneButton: FunctionComponent<Props> = ({ isDisabled, onClick }) => {
  const containerClasses = classNames({
    'processorsEditor__tree__dropZoneContainer--active': !isDisabled,
  });
  const buttonClasses = classNames({
    'processorsEditor__tree__dropZoneButton--active': !isDisabled,
  });

  return (
    <EuiFlexItem className={`processorsEditor__tree__dropZoneContainer ${containerClasses}`}>
      <EuiButtonEmpty
        className={`processorsEditor__tree__dropZoneButton ${buttonClasses}`}
        aria-label={MOVE_HERE_COPY}
        disabled={isDisabled}
        onClick={onClick}
      >
        &nbsp;
      </EuiButtonEmpty>
    </EuiFlexItem>
  );
};
