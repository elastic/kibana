/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiModalHeader,
  EuiModalBody,
  EuiModalHeaderTitle,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { synchronizeMovement } from '../embeddable/synchronize_movement';

interface Props {
  onClose: () => void;
}

export class SynchronizeMovementModal extends Component<Props> {

  _renderSwitches() {
    return synchronizeMovement.getMapPanels().map(mapPanel => {
      return (
        <EuiFormRow display="columnCompressedSwitch" key={mapPanel.id}>
          <EuiSwitch
            label={mapPanel.getTitle()}
            checked={mapPanel.getIsMovementSynchronized()}
            onChange={(event: EuiSwitchEvent) => {
              mapPanel.setIsMovementSynchronized(event.target.checked);
              this.forceUpdate();
            }}
            compressed
          />
        </EuiFormRow>
      );
    });
  }

  render() {
    return (
      <Fragment>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {i18n.translate('xpack.maps.synchronizeMovementAction.title', {
              defaultMessage: 'Synchronize map movement',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          {this._renderSwitches()}
        </EuiModalBody>
      </Fragment>
    );
  }
}
