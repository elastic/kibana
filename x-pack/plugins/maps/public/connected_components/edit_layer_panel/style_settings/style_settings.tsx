/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { CustomIcon, StyleDescriptor } from '../../../../common/descriptor_types';
import { ILayer } from '../../../classes/layers/layer';

export interface Props {
  layer: ILayer;
  updateStyleDescriptor: (styleDescriptor: StyleDescriptor) => void;
  updateCustomIcons: (customIcons: Record<string, CustomIcon>) => void;
  customIcons: CustomIcon[];
}

export function StyleSettings({ layer, updateStyleDescriptor, updateCustomIcons }: Props) {
  const settingsEditor = layer.renderStyleEditor(updateStyleDescriptor, updateCustomIcons);

  if (!settingsEditor) {
    return null;
  }

  return (
    <Fragment>
      <EuiPanel className="mapStyleSettings">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h5>
                <FormattedMessage
                  id="xpack.maps.layerPanel.styleSettingsTitle"
                  defaultMessage="Layer Style"
                />
              </h5>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {settingsEditor}
      </EuiPanel>

      <EuiSpacer size="s" />
    </Fragment>
  );
}
