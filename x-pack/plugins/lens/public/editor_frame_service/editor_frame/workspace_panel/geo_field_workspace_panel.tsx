/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  UiActionsStart,
  VISUALIZE_GEO_FIELD_TRIGGER,
} from '../../../../../../../src/plugins/ui_actions/public';
import { getVisualizeGeoFieldMessage } from '../../../utils';
import { DragDrop } from '../../../drag_drop';
import './geo_field_workspace_panel.scss';

interface Props {
  fieldType: string;
  fieldName: string;
  indexPatternId: string;
  uiActions: UiActionsStart;
}

const dragDropIdentifier = {
  id: 'lnsGeoFieldWorkspace',
  humanData: {
    label: i18n.translate('xpack.lens.geoFieldWorkspace.workspaceLabel', {
      defaultMessage: 'Geo field workspace',
    }),
  },
};

const dragDropOrder = [1, 0, 0, 0];

export function GeoFieldWorkspacePanel(props: Props) {
  function onDrop() {
    props.uiActions.getTrigger(VISUALIZE_GEO_FIELD_TRIGGER).exec({
      indexPatternId: props.indexPatternId,
      fieldName: props.fieldName,
    });
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
        dataTestSubj="lnsGeoFieldWorkspace"
        draggable={false}
        dropTypes={['field_add']}
        order={dragDropOrder}
        value={dragDropIdentifier}
        onDrop={onDrop}
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
