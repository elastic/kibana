/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../../../../common/constants';
import { useFetchSloHealth } from '../../../../hooks/use_fetch_slo_health';
import { useKibana } from '../../../../utils/kibana_react';

export function HealthCallout({ sloList }: { sloList: SLOWithSummaryResponse[] }) {
  const { http } = useKibana().services;
  const { isLoading, isError, data: results } = useFetchSloHealth({ list: sloList });
  const [showCallOut, setShowCallOut] = useState(
    !sessionStorage.getItem('slo_health_callout_hidden')
  );

  if (isLoading || isError || results === undefined || results?.length === 0) {
    return null;
  }

  const unhealthySloList = results.filter((result) => result.health.overall === 'unhealthy');
  if (unhealthySloList.length === 0) {
    return null;
  }

  const unhealthyRollupTransforms = results.filter(
    (result) => result.health.rollup === 'unhealthy'
  );
  const unhealthySummaryTransforms = results.filter(
    (result) => result.health.summary === 'unhealthy'
  );

  const onDismiss = () => {
    setShowCallOut(false);
    sessionStorage.setItem('slo_health_callout_hidden', 'true');
  };

  if (!showCallOut) {
    return null;
  }

  return (
    <EuiCallOut
      color="warning"
      iconType="warning"
      onDismiss={onDismiss}
      title={i18n.translate('xpack.slo.sloList.healthCallout.title', {
        defaultMessage: 'Some SLOs have issues with their transform',
      })}
    >
      <EuiFlexGroup direction="column" alignItems="flexStart">
        <EuiFlexItem>
          <FormattedMessage
            id="xpack.slo.sloList.healthCallout.description"
            defaultMessage="The following {count, plural, one {transform is} other {transforms are}
          } in an unhealthy state:"
            values={{
              count: unhealthyRollupTransforms.length + unhealthySummaryTransforms.length,
            }}
          />
          <ul>
            {unhealthyRollupTransforms.map((result) => (
              <li>
                {getSLOTransformId(result.sloId, result.sloRevision)}
                <EuiCopy textToCopy={getSLOTransformId(result.sloId, result.sloRevision)}>
                  {(copy) => (
                    <EuiButtonIcon
                      data-test-subj="sloHealthCalloutCopyButton"
                      aria-label={i18n.translate(
                        'xpack.slo.sloList.healthCallout.copyToClipboard',
                        { defaultMessage: 'Copy to clipboard' }
                      )}
                      color="text"
                      iconType="copy"
                      onClick={copy}
                    />
                  )}
                </EuiCopy>
              </li>
            ))}

            {unhealthySummaryTransforms.map((result) => (
              <li>
                {getSLOSummaryTransformId(result.sloId, result.sloRevision)}
                <EuiCopy textToCopy={getSLOSummaryTransformId(result.sloId, result.sloRevision)}>
                  {(copy) => (
                    <EuiButtonIcon
                      data-test-subj="sloHealthCalloutCopyButton"
                      aria-label={i18n.translate(
                        'xpack.slo.sloList.healthCallout.copyToClipboard',
                        { defaultMessage: 'Copy to clipboard' }
                      )}
                      color="text"
                      iconType="copy"
                      onClick={copy}
                    />
                  )}
                </EuiCopy>
              </li>
            ))}
          </ul>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="sloHealthCalloutInspectTransformButton"
            color="warning"
            fill
            href={http?.basePath.prepend('/app/management/data/transform')}
          >
            <FormattedMessage
              id="xpack.slo.sloList.healthCallout.buttonTransformLabel"
              defaultMessage="Inspect transform"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
