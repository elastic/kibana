/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import { stringify } from 'query-string';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';

import { getRedirectAppPath } from '../../../common/constants';
import { buildKibanaPath } from '../../../common/build_kibana_path';
import { useKibana } from '../../shared_imports';
import { Job } from '../../lib/job';

interface Props {
  job: Job;
}

const i18nTexts = {
  label: i18n.translate('xpack.reporting.listing.table.viewInAppLinkIconLabel', {
    defaultMessage: 'Open the Kibana App where this report was generated.',
  }),
};

export const ViewInAppLink: FunctionComponent<Props> = ({ job }) => {
  const {
    services: { http },
  } = useKibana();

  const searchParams = stringify({ jobId: job.id });

  const path = buildKibanaPath({
    basePath: http.basePath.serverBasePath,
    spaceId: job.spaceId,
    appPath: getRedirectAppPath(),
  });
  const href = `${path}?${searchParams}`;

  return (
    <EuiToolTip content={i18nTexts.label}>
      <EuiButtonIcon target="_blank" aria-label={i18nTexts.label} iconType="popout" href={href} />
    </EuiToolTip>
  );
};
