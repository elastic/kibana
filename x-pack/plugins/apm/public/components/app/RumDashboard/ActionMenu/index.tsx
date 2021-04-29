/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  createExploratoryViewUrl,
  HeaderMenuPortal,
  SeriesUrl,
} from '../../../../../../observability/public';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { AppMountParameters } from '../../../../../../../../src/core/public';

const ANALYZE_DATA = i18n.translate('xpack.apm.analyzeDataButtonLabel', {
  defaultMessage: 'Analyze data',
});

export function UXActionMenu({
  appMountParameters,
}: {
  appMountParameters: AppMountParameters;
}) {
  const {
    services: { http },
  } = useKibana();
  const { urlParams } = useUrlParams();
  const { rangeTo, rangeFrom } = urlParams;

  const syntheticExploratoryViewLink = createExploratoryViewUrl(
    {
      'ux-series': {
        dataType: 'ux',
        time: { from: rangeFrom, to: rangeTo },
      } as SeriesUrl,
    },
    http?.basePath.get()
  );

  return (
    <HeaderMenuPortal
      setHeaderActionMenu={appMountParameters.setHeaderActionMenu}
    >
      <EuiFlexGroup
        alignItems="flexEnd"
        responsive={false}
        style={{ paddingRight: 20 }}
      >
        <EuiFlexItem>
          <EuiButtonEmpty
            href={syntheticExploratoryViewLink}
            color="primary"
            iconType="visBarVerticalStacked"
          >
            {ANALYZE_DATA}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </HeaderMenuPortal>
  );
}
