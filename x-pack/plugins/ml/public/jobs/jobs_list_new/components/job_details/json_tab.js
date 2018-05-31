/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiSpacer,
  EuiCodeEditor
} from '@elastic/eui';


const WIDTH = '100%';
const HEIGHT = '500px';
const MODE = 'json';

export function JsonPane({ job }) {
  const json = JSON.stringify(job, null, 2);
  return (
    <React.Fragment>
      <EuiSpacer size="s" />
      <EuiCodeEditor
        value={json}
        width={WIDTH}
        height={HEIGHT}
        mode={MODE}
        readOnly={true}
        wrapEnabled={true}
      />
    </React.Fragment>
  );
}
