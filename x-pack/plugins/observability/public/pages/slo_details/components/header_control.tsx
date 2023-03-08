/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';

import { paths } from '../../../config';
import { useKibana } from '../../../utils/kibana_react';
import { ObservabilityAppServices } from '../../../application/types';
import { useCapabilities } from '../../../hooks/slo/use_capabilities';

export interface Props {
  slo: SLOWithSummaryResponse | undefined;
  isLoading: boolean;
}

export function HeaderControl({ isLoading, slo }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana<ObservabilityAppServices>().services;
  const { hasWriteCapabilities } = useCapabilities();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleActionsClick = () => setIsPopoverOpen((value) => !value);
  const closePopover = () => setIsPopoverOpen(false);

  const handleEdit = () => {
    if (slo) {
      navigateToUrl(basePath.prepend(paths.observability.sloEdit(slo.id)));
    }
  };

  return (
    <EuiPopover
      data-test-subj="sloDetailsHeaderControlPopover"
      button={
        <EuiButton
          fill
          iconSide="right"
          iconType="arrowDown"
          iconSize="s"
          onClick={handleActionsClick}
          disabled={isLoading || !slo}
        >
          {i18n.translate('xpack.observability.slo.sloDetails.headerControl.actions', {
            defaultMessage: 'Actions',
          })}
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <EuiContextMenuPanel
        size="s"
        items={[
          <EuiContextMenuItem
            key="edit"
            icon="pencil"
            disabled={!hasWriteCapabilities}
            onClick={handleEdit}
            data-test-subj="sloDetailsHeaderControlPopoverEdit"
          >
            {i18n.translate('xpack.observability.slo.sloDetails.headerControl.edit', {
              defaultMessage: 'Edit',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
}
