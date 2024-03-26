/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { createSloDetailsUrl } from '../../../utils/slo/create_slo_details_url';

export function SloRemoteCallout({ slo }: { slo: SLOWithSummaryResponse }) {
  const sloDetailsUrl = createSloDetailsUrl(slo);

  return slo.remoteName ? (
    <EuiCallOut
      title={i18n.translate('xpack.slo.sloDetails.headerTitle.calloutMessage', {
        defaultMessage: 'Remote SLO',
      })}
    >
      <p>
        <FormattedMessage
          id="xpack.slo.sloDetails.headerTitle.calloutDescription"
          defaultMessage="This is a remote SLO which belongs to another Kibana instance. it is fetched from the remote cluster: {remoteName} with kibana url {kibanaUrl}."
          values={{
            remoteName: <strong>{slo.remoteName}</strong>,
            kibanaUrl: (
              <EuiLink
                data-test-subj="sloSloRemoteCalloutLink"
                href={slo.kibanaUrl}
                target="_blank"
              >
                {slo.kibanaUrl}
              </EuiLink>
            ),
          }}
        />
      </p>
      <EuiButton
        data-test-subj="o11yHeaderTitleLinkButtonButton"
        href={sloDetailsUrl}
        color="primary"
        target="_blank"
      >
        {i18n.translate('xpack.slo.headerTitle.linkButtonButtonLabel', {
          defaultMessage: 'View remote SLO details',
        })}
      </EuiButton>
    </EuiCallOut>
  ) : null;
}
