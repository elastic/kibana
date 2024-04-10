/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../utils/kibana_react';
import { useFetchSloDefinitions } from '../../../hooks/use_fetch_slo_definitions';
import { paths } from '../../../../common/locators/paths';

export function SloOutdatedCallout() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const handleClick = () => {
    navigateToUrl(basePath.prepend(paths.slosOutdatedDefinitions));
  };

  const { isLoading, data } = useFetchSloDefinitions({ includeOutdatedOnly: true });
  if (!isLoading && data && data.total > 0) {
    return (
      <>
        <EuiCallOut
          color="warning"
          iconType="warning"
          title={i18n.translate('xpack.slo.outdatedSloCallout.title', {
            defaultMessage: '{total} Outdated SLOs Detected',
            values: {
              total: data.total,
            },
          })}
        >
          <p>
            <FormattedMessage
              id="xpack.slo.outdatedSloCallout.message"
              defaultMessage="We've noticed that you have {total} outdated SLO definitions, these SLOs will not be running or alerting until you've reset them. Please click the button below to review the SLO definitions; you can choose to either reset the SLO definition or remove it."
              values={{ total: data.total }}
            />
          </p>
          <p>
            <EuiButton
              color="warning"
              data-test-subj="o11ySloOutdatedCalloutViewOutdatedSloDefinitionsButton"
              fill
              onClick={handleClick}
            >
              <FormattedMessage
                id="xpack.slo.outdatedSloCallout.buttonLabel"
                defaultMessage="Review Outdated SLO Definitions"
              />
            </EuiButton>
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  }
  return null;
}
