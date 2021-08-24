/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { RequestAdapter } from '../../../../../../../src/plugins/inspector/common';
import { InspectorSession } from '../../../../../../../src/plugins/inspector/public';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

interface InspectorProps {}
const inspectorAdapters = { requests: new RequestAdapter() };

export function Inspector({}: InspectorProps) {
  const { inspector } = useApmPluginContext();
  const inspect = () => {
    inspector.open(inspectorAdapters);
  };

  return (
    <EuiHeaderLink color="primary" onClick={inspect}>
      {i18n.translate('xpack.apm.inspectButtonText', {
        defaultMessage: 'Inspect',
      })}
    </EuiHeaderLink>
  );
}
