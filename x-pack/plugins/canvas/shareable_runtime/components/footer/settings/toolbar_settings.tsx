/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiSwitch, EuiFormRow } from '@elastic/eui';
import { useCanvasShareableState, setToolbarAutohideAction } from '../../../context';

export type onSetAutohideFn = (isAutohide: boolean) => void;

export interface Props {
  /**
   * True if the toolbar should be hidden when the mouse is not within the workpad,
   * false otherwise.
   */
  isAutohide: boolean;

  /**
   * The handler to invoke when autohide is set.
   */
  onSetAutohide: onSetAutohideFn;
}

/**
 * The settings panel for the Toolbar of a Shareable Canvas Workpad.
 */
export const ToolbarSettingsComponent = ({ isAutohide, onSetAutohide }: Props) => {
  return (
    <div style={{ padding: 16 }}>
      <EuiFormRow helpText="Hide the toolbar when the mouse is not within the Canvas?">
        <EuiSwitch
          data-test-subj="hideToolbarSwitch"
          name="toolbarHide"
          id="toolbarHide"
          label="Hide Toolbar"
          checked={isAutohide}
          onChange={() => onSetAutohide(!isAutohide)}
        />
      </EuiFormRow>
    </div>
  );
};

/**
 * A store-connected container for the `ToolbarSettings` component.
 */
export const ToolbarSettings: FC<Pick<Props, 'onSetAutohide'>> = ({ onSetAutohide }) => {
  const [{ settings }, dispatch] = useCanvasShareableState();

  const { toolbar } = settings;
  const { isAutohide } = toolbar;

  const onSetAutohideFn: onSetAutohideFn = (autohide: boolean) => {
    onSetAutohide(autohide);
    dispatch(setToolbarAutohideAction(autohide));
  };

  return <ToolbarSettingsComponent onSetAutohide={onSetAutohideFn} {...{ isAutohide }} />;
};
