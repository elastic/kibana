/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu, EuiHeaderLink, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALL_VALUE } from '@kbn/slo-schema';
import React, { useCallback, useState } from 'react';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import type { ApmIndicatorType } from '../../../../../common/slo_indicator_types';
import { APM_SLO_INDICATOR_TYPES } from '../../../../../common/slo_indicator_types';
import type { ApmPluginStartDeps } from '../../../../plugin';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useManageSlosUrl } from '../../../../hooks/use_manage_slos_url';
import { useServiceName } from '../../../../hooks/use_service_name';

const sloLabel = i18n.translate('xpack.apm.home.sloMenu.slosHeaderLink', {
  defaultMessage: 'SLOs',
});

const createLatencySloLabel = i18n.translate('xpack.apm.home.sloMenu.createLatencySlo', {
  defaultMessage: 'Create APM latency SLO',
});

const createAvailabilitySloLabel = i18n.translate('xpack.apm.home.sloMenu.createAvailabilitySlo', {
  defaultMessage: 'Create APM availability SLO',
});

const manageSlosLabel = i18n.translate('xpack.apm.home.sloMenu.manageSlos', {
  defaultMessage: 'Manage SLOs',
});

interface Props {
  canReadSlos: boolean;
  canWriteSlos: boolean;
}

export function SloPopoverAndFlyout({ canReadSlos, canWriteSlos }: Props) {
  const { slo } = useKibana<ApmPluginStartDeps>().services;
  const { query } = useApmParams('/*');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [flyoutState, setFlyoutState] = useState<{
    isOpen: boolean;
    indicatorType: ApmIndicatorType | null;
  }>({
    isOpen: false,
    indicatorType: null,
  });

  const serviceName = useServiceName();
  const apmEnvironment = ('environment' in query && query.environment) || ENVIRONMENT_ALL.value;
  const sloEnvironment = apmEnvironment === ENVIRONMENT_ALL.value ? ALL_VALUE : apmEnvironment;
  const manageSlosUrl = useManageSlosUrl();

  const openFlyout = useCallback((indicatorType: ApmIndicatorType) => {
    setFlyoutState({ isOpen: true, indicatorType });
    setPopoverOpen(false);
  }, []);

  const closeFlyout = useCallback(() => {
    setFlyoutState({ isOpen: false, indicatorType: null });
  }, []);

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: sloLabel,
      items: [
        ...(canWriteSlos
          ? [
              {
                name: createLatencySloLabel,
                onClick: () => openFlyout('sli.apm.transactionDuration'),
                'data-test-subj': 'apmSlosMenuItemCreateLatencySlo',
              },
              {
                name: createAvailabilitySloLabel,
                onClick: () => openFlyout('sli.apm.transactionErrorRate'),
                'data-test-subj': 'apmSlosMenuItemCreateAvailabilitySlo',
              },
            ]
          : []),
        ...(canReadSlos
          ? [
              {
                name: manageSlosLabel,
                href: manageSlosUrl,
                icon: 'tableOfContents',
                'data-test-subj': 'apmSlosMenuItemManageSlos',
              },
            ]
          : []),
      ],
    },
  ];

  const CreateSloFlyout =
    flyoutState.isOpen && flyoutState.indicatorType
      ? slo?.getCreateSLOFormFlyout({
          initialValues: {
            ...(serviceName && { name: `APM SLO for ${serviceName}` }),
            indicator: {
              type: flyoutState.indicatorType,
              params: {
                ...(serviceName && { service: serviceName }),
                environment: sloEnvironment,
              },
            },
          },
          onClose: closeFlyout,
          formSettings: {
            allowedIndicatorTypes: [...APM_SLO_INDICATOR_TYPES],
          },
        })
      : null;

  return (
    <>
      <EuiPopover
        id="slos-menu"
        button={
          <EuiHeaderLink
            color="primary"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => setPopoverOpen((prevState) => !prevState)}
            data-test-subj="apmSlosHeaderLink"
          >
            {sloLabel}
          </EuiHeaderLink>
        }
        isOpen={popoverOpen}
        closePopover={() => setPopoverOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downRight"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
      {CreateSloFlyout}
    </>
  );
}
