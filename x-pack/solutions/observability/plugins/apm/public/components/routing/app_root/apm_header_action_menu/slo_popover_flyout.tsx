/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu, EuiHeaderLink, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import rison from '@kbn/rison';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ApmPluginStartDeps } from '../../../../plugin';

const sloLabel = i18n.translate('xpack.apm.home.sloMenu.slos', {
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

type SloIndicatorType = 'sli.apm.transactionDuration' | 'sli.apm.transactionErrorRate';

interface Props {
  canReadSlos: boolean;
  canWriteSlos: boolean;
}

export function SloPopoverAndFlyout({ canReadSlos, canWriteSlos }: Props) {
  const { slo, http } = useKibana<ApmPluginStartDeps>().services;
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [flyoutState, setFlyoutState] = useState<{
    isOpen: boolean;
    indicatorType: SloIndicatorType | null;
  }>({
    isOpen: false,
    indicatorType: null,
  });

  const openFlyout = (indicatorType: SloIndicatorType) => {
    setFlyoutState({ isOpen: true, indicatorType });
    setPopoverOpen(false);
  };

  const closeFlyout = () => {
    setFlyoutState({ isOpen: false, indicatorType: null });
  };

  const manageSlosUrl = useMemo(() => {
    const searchParams = rison.encode({
      filters: [
        {
          meta: {
            alias: null,
            disabled: false,
            key: 'slo.indicator.type',
            negate: false,
            params: ['sli.apm.transactionDuration', 'sli.apm.transactionErrorRate'],
            type: 'phrases',
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                { match_phrase: { 'slo.indicator.type': 'sli.apm.transactionDuration' } },
                { match_phrase: { 'slo.indicator.type': 'sli.apm.transactionErrorRate' } },
              ],
            },
          },
        },
      ],
    });

    return http?.basePath.prepend(`/app/slos?search=${searchParams}`);
  }, [http?.basePath]);

  const button = (
    <EuiHeaderLink
      color="primary"
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setPopoverOpen((prevState) => !prevState)}
      data-test-subj="apmSlosHeaderLink"
    >
      {sloLabel}
    </EuiHeaderLink>
  );

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
            indicator: {
              type: flyoutState.indicatorType,
              params: {},
            },
          },
          onClose: closeFlyout,
        })
      : null;

  return (
    <>
      <EuiPopover
        id="slos-menu"
        button={button}
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
