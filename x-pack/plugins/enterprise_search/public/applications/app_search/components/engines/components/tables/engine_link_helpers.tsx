/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLink } from '@elastic/eui';

import { getAppSearchUrl } from '../../../../../shared/enterprise_search_url';
import { KibanaLogic } from '../../../../../shared/kibana';
import { TelemetryLogic } from '../../../../../shared/telemetry';
import { ENGINE_PATH } from '../../../../routes';
import { generateEncodedPath } from '../../../../utils/encode_path_params';

const sendEngineTableLinkClickTelemetry = () => {
  TelemetryLogic.actions.sendAppSearchTelemetry({
    action: 'clicked',
    metric: 'engine_table_link',
  });
};

export const navigateToEngine = (engineName: string) => {
  sendEngineTableLinkClickTelemetry();
  KibanaLogic.values.navigateToUrl(
    getAppSearchUrl(generateEncodedPath(ENGINE_PATH, { engineName })),
    { shouldNotCreateHref: true }
  );
};

export const renderEngineLink = (engineName: string) => (
  // eslint-disable-next-line @elastic/eui/href-or-on-click
  <EuiLink
    href={getAppSearchUrl(generateEncodedPath(ENGINE_PATH, { engineName }))}
    target="_blank"
    onClick={sendEngineTableLinkClickTelemetry}
    data-test-subj="EngineName"
  >
    {engineName}
  </EuiLink>
);
