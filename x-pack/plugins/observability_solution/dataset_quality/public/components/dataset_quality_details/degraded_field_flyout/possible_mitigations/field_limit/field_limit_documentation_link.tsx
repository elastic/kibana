/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiLink } from '@elastic/eui';
import { useKibanaContextForPlugin } from '../../../../../utils';
import { fieldLimitMitigationOfficialDocumentation } from '../../../../../../common/translations';

export function FieldLimitDocLink() {
  const {
    services: { docLinks },
  } = useKibanaContextForPlugin();

  return (
    <EuiFlexGroup responsive={false} justifyContent="flexEnd" gutterSize="xs">
      <EuiLink
        data-test-subj="datasetQualityManualMitigationsPipelineLink"
        href={docLinks.links.elasticsearch.mappingSettingsLimit}
        external
        target="_blank"
      >
        {fieldLimitMitigationOfficialDocumentation}
      </EuiLink>
    </EuiFlexGroup>
  );
}
