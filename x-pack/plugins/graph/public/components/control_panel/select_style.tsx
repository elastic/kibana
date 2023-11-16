/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon } from '@elastic/eui';
import { Workspace } from '../../types';

interface SelectStyleProps {
  workspace: Workspace;
  colors: string[];
}

export const SelectStyle = ({ colors, workspace }: SelectStyleProps) => {
  return (
    <div className="gphSidebar__panel">
      <div className="gphSidebar__header">
        <EuiIcon type="brush" size="s" />{' '}
        {i18n.translate('xpack.graph.sidebar.styleVerticesTitle', {
          defaultMessage: 'Style selected vertices',
        })}
      </div>

      <div className="form-group form-group-sm gphFormGroup--small">
        {colors.map((c) => {
          const onSelectColor = () => {
            workspace.colorSelected(c);
            workspace.changeHandler();
          };
          return (
            <EuiIcon
              type="stopFilled"
              color={c}
              className="gphColorPicker__color"
              aria-hidden="true"
              onClick={onSelectColor}
            />
          );
        })}
      </div>
    </div>
  );
};
