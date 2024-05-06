/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { useKibana } from '../../../../../common/lib/kibana';
import type { ImmutableArray } from '../../../../../../common/endpoint/types';
import type { TransformStats } from '../../types';
import { WARNING_TRANSFORM_STATES } from '../../../../../../common/constants';
import { metadataTransformPrefix } from '../../../../../../common/endpoint/constants';
import { LinkToApp } from '../../../../../common/components/endpoint/link_to_app';
import { CallOut } from '../../../../../common/components/callouts';
import type { EndpointAction } from '../../store/action';

const TRANSFORM_URL = '/data/transform';

interface TransformFailedCalloutProps {
  hasNoPolicyData: boolean;
  metadataTransformStats: ImmutableArray<TransformStats>;
}

export const TransformFailedCallout = memo<TransformFailedCalloutProps>(
  ({ hasNoPolicyData, metadataTransformStats }) => {
    const [showTransformFailedCallout, setShowTransformFailedCallout] = useState(false);
    const [shouldCheckTransforms, setShouldCheckTransforms] = useState(true);
    const { services } = useKibana();
    const dispatch = useDispatch<(a: EndpointAction) => void>();

    useEffect(() => {
      // if no endpoint policy, skip transform check
      if (!shouldCheckTransforms || hasNoPolicyData) {
        return;
      }

      dispatch({ type: 'loadMetadataTransformStats' });
      setShouldCheckTransforms(false);
    }, [dispatch, hasNoPolicyData, shouldCheckTransforms]);

    useEffect(() => {
      const hasFailure = metadataTransformStats.some((transform) =>
        WARNING_TRANSFORM_STATES.has(transform?.state)
      );
      setShowTransformFailedCallout(hasFailure);
    }, [metadataTransformStats]);

    const closeTransformFailedCallout = useCallback(() => {
      setShowTransformFailedCallout(false);
    }, []);

    const failingTransformIds: string = useMemo(
      () =>
        metadataTransformStats
          .reduce<string[]>((acc, currentValue) => {
            if (WARNING_TRANSFORM_STATES.has(currentValue.state)) {
              acc.push(currentValue.id);
            }
            return acc;
          }, [])
          .join(', '),
      [metadataTransformStats]
    );

    const calloutDescription = useMemo(
      () => (
        <>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.list.transformFailed.message"
            defaultMessage="A required transform, {transformId}, is currently failing. Most of the time this can be fixed by {transformsPage}. For additional help, please visit the {docsPage}"
            values={{
              transformId: failingTransformIds || metadataTransformPrefix,
              transformsPage: (
                <LinkToApp
                  data-test-subj="failed-transform-restart-link"
                  appId="management"
                  appPath={TRANSFORM_URL}
                >
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.list.transformFailed.restartLink"
                    defaultMessage="restarting the transform"
                  />
                </LinkToApp>
              ),
              docsPage: (
                <EuiLink
                  data-test-subj="failed-transform-docs-link"
                  href={services.docLinks.links.endpoints.troubleshooting}
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.list.transformFailed.docsLink"
                    defaultMessage="troubleshooting documentation"
                  />
                </EuiLink>
              ),
            }}
          />
          <EuiSpacer size="s" />
        </>
      ),
      [failingTransformIds, services.docLinks.links.endpoints.troubleshooting]
    );

    if (!showTransformFailedCallout) {
      return <></>;
    }

    return (
      <>
        <CallOut
          message={{
            id: 'endpoints-list-transform-failed',
            type: 'warning',
            title: i18n.translate('xpack.securitySolution.endpoint.list.transformFailed.title', {
              defaultMessage: 'Required transform failed',
            }),
            description: calloutDescription,
          }}
          dismissButtonText={i18n.translate(
            'xpack.securitySolution.endpoint.list.transformFailed.dismiss',
            {
              defaultMessage: 'Dismiss',
            }
          )}
          onDismiss={closeTransformFailedCallout}
          showDismissButton={true}
        />
        <EuiSpacer size="m" />
      </>
    );
  }
);

TransformFailedCallout.displayName = 'TransformFailedCallout';
