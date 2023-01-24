/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { UiActionsStart, VISUALIZE_GEO_FIELD_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { GlobeIllustration } from '@kbn/chart-icons';
import { IndexPattern } from '../../../types';
import { getVisualizeGeoFieldMessage } from '../../../utils';
import { DragDrop } from '../../../drag_drop';
import { APP_ID } from '../../../../common/constants';
import './geo_field_workspace_panel.scss';

interface Props {
  fieldType: string;
  fieldName: string;
  indexPattern: IndexPattern;
  uiActions: UiActionsStart;
}

const dragDropIdentifier = {
  id: 'lnsGeoFieldWorkspace',
  humanData: {
    label: i18n.translate('xpack.lens.geoFieldWorkspace.dropZoneLabel', {
      defaultMessage: 'drop zone to open in maps',
    }),
  },
};

const dragDropOrder = [1, 0, 0, 0];

export function GeoFieldWorkspacePanel(props: Props) {
  function onDrop() {
    props.uiActions.getTrigger(VISUALIZE_GEO_FIELD_TRIGGER).exec({
      dataViewSpec: props.indexPattern.spec,
      fieldName: props.fieldName,
      originatingApp: APP_ID,
    });
  }

  return (
    <div className="lnsWorkspacePanelWrapper__pageContentBody">
      <EuiText className="lnsWorkspacePanel__emptyContent" textAlign="center" size="s">
        <div>
          <h2>
            <strong>{getVisualizeGeoFieldMessage(props.fieldType)}</strong>
          </h2>
          <GlobeIllustration aria-hidden={true} className="lnsWorkspacePanel__promptIllustration" />
          <DragDrop
            className="lnsVisualizeGeoFieldWorkspacePanel__dragDrop"
            dataTestSubj="lnsGeoFieldWorkspace"
            draggable={false}
            dropTypes={['field_add']}
            order={dragDropOrder}
            value={dragDropIdentifier}
            onDrop={onDrop}
          >
            <p>
              <strong>
                <FormattedMessage
                  id="xpack.lens.geoFieldWorkspace.dropMessage"
                  defaultMessage="Drop field here to open in Maps"
                />
              </strong>
            </p>
          </DragDrop>
        </div>
      </EuiText>
    </div>
  );
}
