/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { UiActionsStart } from '../../../../../../../src/plugins/ui_actions/public';
import { getVisualizeGeoFieldMessage } from '../../../utils';
import { DragDrop } from '../../../drag_drop';
import './geo_field_workspace_panel.scss';

interface Props {
  fieldType: string;
  fieldName: string;
  indexPatternId: string;
  uiActions: UiActionsStart;
}

export function GeoFieldWorkspacePanel(props: Props) {
  async function onDrop() {
    console.log('onDrop');
  }

  return (
    <EuiText
      className="lnsWorkspacePanel__emptyContent"
      textAlign="center"
      color="subdued"
      size="s"
    >
      <h2>
        <strong>{getVisualizeGeoFieldMessage(props.fieldType)}</strong>
      </h2>
      <DragDrop
        className="lnsVisualizeGeoFieldWorkspacePanel__dragDrop"
        draggable={false}
        onDrop={onDrop}
        value={props.fieldName}
      >
        <div>
          <FormattedMessage
            id="xpack.lens.geoFieldWorkspace.dropMessage"
            defaultMessage="Drop field here to open in Maps"
          />
        </div>
      </DragDrop>
    </EuiText>
  );
}
