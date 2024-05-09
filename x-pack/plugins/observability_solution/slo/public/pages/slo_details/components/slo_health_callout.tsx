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
import React from 'react';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../../../common/constants';
import { useFetchSloHealth } from '../../../hooks/use_fetch_slo_health';
import { useKibana } from '../../../utils/kibana_react';

export function SloHealthCallout({ slo }: { slo: SLOWithSummaryResponse }) {
  const { http } = useKibana().services;
  const { isLoading, isError, data } = useFetchSloHealth({ list: [slo] });

  if (isLoading || isError || data === undefined || data?.length !== 1) {
    return null;
  }

  const health = data[0].health;
  if (health.overall === 'healthy') {
    return null;
  }

  const count = health.rollup === 'unhealthy' && health.summary === 'unhealthy' ? 2 : 1;

  return (
    <EuiCallOut
      color="danger"
      iconType="warning"
      title={i18n.translate('xpack.slo.sloDetails.healthCallout.title', {
        defaultMessage: 'This SLO has issues with its transforms',
      })}
    >
      <EuiFlexGroup direction="column" alignItems="flexStart">
        <EuiFlexItem>
          <FormattedMessage
            id="xpack.slo.sloDetails.healthCallout.description"
            defaultMessage="The following {count, plural, one {transform is} other {transforms are}
          } in an unhealthy state:"
            values={{ count }}
          />
          <ul>
            {health.rollup === 'unhealthy' && (
              <li>
                {getSLOTransformId(slo.id, slo.revision)}
                <EuiCopy textToCopy={getSLOTransformId(slo.id, slo.revision)}>
                  {(copy) => (
                    <EuiButtonIcon
                      data-test-subj="sloSloHealthCalloutCopyButton"
                      aria-label={i18n.translate(
                        'xpack.slo.sloDetails.healthCallout.copyToClipboard',
                        { defaultMessage: 'Copy to clipboard' }
                      )}
                      color="text"
                      iconType="copy"
                      onClick={copy}
                    />
                  )}
                </EuiCopy>
              </li>
            )}
            {health.summary === 'unhealthy' && (
              <li>
                {getSLOSummaryTransformId(slo.id, slo.revision)}
                <EuiCopy textToCopy={getSLOSummaryTransformId(slo.id, slo.revision)}>
                  {(copy) => (
                    <EuiButtonIcon
                      data-test-subj="sloSloHealthCalloutCopyButton"
                      aria-label={i18n.translate(
                        'xpack.slo.sloDetails.healthCallout.copyToClipboard',
                        { defaultMessage: 'Copy to clipboard' }
                      )}
                      color="text"
                      iconType="copy"
                      onClick={copy}
                    />
                  )}
                </EuiCopy>
              </li>
            )}
          </ul>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="sloSloHealthCalloutInspectTransformButton"
            color="danger"
            fill
            href={http?.basePath.prepend('/app/management/data/transform')}
          >
            <FormattedMessage
              id="xpack.slo.sloDetails.healthCallout.buttonTransformLabel"
              defaultMessage="Inspect transform"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
