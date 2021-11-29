/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { useEuiTheme, EuiText } from '@elastic/eui';
import { ClassNames } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { sidebarPanelClassName, sidebarPanelStylesFactory } from '../shared_styles';

const strings = {
  getSaveGroupDescription: () =>
    i18n.translate('xpack.canvas.groupSettings.saveGroupDescription', {
      defaultMessage: 'Save this group as a new element to re-use it throughout your workpad.',
    }),
  getUngroupDescription: () =>
    i18n.translate('xpack.canvas.groupSettings.ungroupDescription', {
      defaultMessage: 'Ungroup ({uKey}) to edit individual element settings.',
      values: {
        uKey: 'U',
      },
    }),
};

export const GroupSettings: FunctionComponent = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <ClassNames>
      {({ css, cx }) => (
        <div
          className={cx(
            sidebarPanelClassName,
            `${sidebarPanelClassName}--isEmpty`,
            css(sidebarPanelStylesFactory(euiTheme))
          )}
        >
          <EuiText size="s">
            <p>{strings.getUngroupDescription()}</p>
            <p>{strings.getSaveGroupDescription()}</p>
          </EuiText>
        </div>
      )}
    </ClassNames>
  );
};
