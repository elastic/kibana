/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, ReactEventHandler } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { ComponentStrings } from '../../../i18n';

const { PagePreviewPageControls: strings } = ComponentStrings;

interface Props {
  pageId: string;
  onRemove: (pageId: string) => void;
  onDuplicate: (pageId: string) => void;
}

export const PageControls: FC<Props> = ({ pageId, onRemove, onDuplicate }) => {
  const handleDuplicate: ReactEventHandler = (ev) => {
    ev.preventDefault();
    onDuplicate(pageId);
  };

  const handleRemove: ReactEventHandler = (ev) => {
    ev.preventDefault();
    onRemove(pageId);
  };

  return (
    <EuiFlexGroup
      className="canvasPageManager__controls"
      gutterSize="xs"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip content={strings.getClonePageTooltip()}>
          <EuiButtonIcon
            iconType="copy"
            aria-label={strings.getClonePageAriaLabel()}
            onClick={handleDuplicate}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={strings.getDeletePageTooltip()}>
          <EuiButtonIcon
            color="danger"
            iconType="trash"
            aria-label={strings.getDeletePageAriaLabel()}
            onClick={handleRemove}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

PageControls.propTypes = {
  pageId: PropTypes.string.isRequired,
  onRemove: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func.isRequired,
};
