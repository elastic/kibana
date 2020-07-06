/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

export function LayerErrors({ layer }) {
  if (!layer.hasErrors()) {
    return null;
  }

  return (
    <Fragment>
      <EuiCallOut
        color="warning"
        title={i18n.translate('xpack.maps.layerPanel.settingsPanel.unableToLoadTitle', {
          defaultMessage: 'Unable to load layer',
        })}
      >
        <p data-test-subj="layerErrorMessage">{layer.getErrors()}</p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </Fragment>
  );
}
