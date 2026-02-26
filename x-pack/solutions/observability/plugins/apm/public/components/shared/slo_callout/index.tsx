/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ApmPluginStartDeps } from '../../../plugin';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import {
  APM_SLO_INDICATOR_TYPES,
  type ApmIndicatorType,
} from '../../../../common/slo_indicator_types';
import illustrationSrc from './assets/illustration_slo_callout.svg';

interface Props {
  dismissCallout: () => void;
  serviceName: string;
  environment: string;
}

export function SloCallout({ dismissCallout, serviceName, environment }: Props) {
  const {
    core: { docLinks },
  } = useApmPluginContext();
  const { slo: sloPlugin } = useKibana<ApmPluginStartDeps>().services;

  const [createSloFlyoutOpen, setCreateSloFlyoutOpen] = useState(false);

  const openCreateSloFlyout = useCallback(() => {
    setCreateSloFlyoutOpen(true);
  }, []);

  const closeCreateSloFlyout = useCallback(() => {
    setCreateSloFlyoutOpen(false);
    dismissCallout();
  }, [dismissCallout]);

  const defaultIndicatorType: ApmIndicatorType = 'sli.apm.transactionDuration';

  const CreateSloFlyout = createSloFlyoutOpen
    ? sloPlugin?.getCreateSLOFormFlyout({
        initialValues: {
          name: `APM SLO for ${serviceName}`,
          indicator: {
            type: defaultIndicatorType,
            params: {
              service: serviceName,
              environment: environment === ENVIRONMENT_ALL.value ? '*' : environment,
            },
          },
        },
        onClose: closeCreateSloFlyout,
        formSettings: {
          allowedIndicatorTypes: [...APM_SLO_INDICATOR_TYPES],
        },
      })
    : null;

  return (
    <>
      <EuiCallOut data-test-subj="apmSloCallout" onDismiss={dismissCallout}>
        <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiImage
              src={illustrationSrc}
              alt={i18n.translate('xpack.apm.slo.callout.illustrationAlt', {
                defaultMessage: 'SLO callout illustration',
              })}
              size={128}
              data-test-subj="apmSloCalloutIllustration"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>
                    {i18n.translate('xpack.apm.slo.callout.title', {
                      defaultMessage: "You don't have any SLOs set up for this service yet",
                    })}
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <p>
                    {i18n.translate('xpack.apm.slo.callout.description', {
                      defaultMessage:
                        'Define SLOs to start tracking reliability and performance over time.',
                    })}
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="apmSloCalloutCreateSloButton"
                  size="s"
                  onClick={openCreateSloFlyout}
                >
                  {i18n.translate('xpack.apm.slo.callout.createButton', {
                    defaultMessage: 'Create SLO',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="apmSloCalloutViewDocsButton"
                  size="s"
                  href={docLinks.links.observability.slo}
                  target="_blank"
                  iconType="popout"
                  iconSide="right"
                >
                  {i18n.translate('xpack.apm.slo.callout.viewDocumentation', {
                    defaultMessage: 'View documentation',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
      {CreateSloFlyout}
    </>
  );
}
