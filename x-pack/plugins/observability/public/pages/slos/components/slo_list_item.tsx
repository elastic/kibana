/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { HistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { ActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';
import { useCapabilities } from '../../../hooks/slo/use_capabilities';
import { useKibana } from '../../../utils/kibana_react';
import { useCloneSlo } from '../../../hooks/slo/use_clone_slo';
import { SloSummary } from './slo_summary';
import { SloDeleteConfirmationModal } from './slo_delete_confirmation_modal';
import { SloBadges } from './badges/slo_badges';
import {
  transformSloResponseToCreateSloInput,
  transformValuesToCreateSLOInput,
} from '../../slo_edit/helpers/process_slo_form_values';
import { paths } from '../../../config';

export interface SloListItemProps {
  slo: SLOWithSummaryResponse;
  historicalSummary?: HistoricalSummaryResponse[];
  historicalSummaryLoading: boolean;
  activeAlerts?: ActiveAlerts;
}

export function SloListItem({
  slo,
  historicalSummary = [],
  historicalSummaryLoading,
  activeAlerts,
}: SloListItemProps) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;
  const { hasWriteCapabilities } = useCapabilities();

  const { mutate: cloneSlo } = useCloneSlo();
  const isDeletingSlo = Boolean(useIsMutating(['deleteSlo', slo.id]));

  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [isDeleteConfirmationModalOpen, setDeleteConfirmationModalOpen] = useState(false);

  const handleClickActions = () => {
    setIsActionsPopoverOpen(!isActionsPopoverOpen);
  };

  const handleViewDetails = () => {
    navigateToUrl(basePath.prepend(paths.observability.sloDetails(slo.id)));
  };

  const handleEdit = () => {
    navigateToUrl(basePath.prepend(paths.observability.sloEdit(slo.id)));
  };

  const handleClone = () => {
    const newSlo = transformValuesToCreateSLOInput(
      transformSloResponseToCreateSloInput({ ...slo, name: `[Copy] ${slo.name}` })!
    );

    cloneSlo({ slo: newSlo, idToCopyFrom: slo.id });
    setIsActionsPopoverOpen(false);
  };

  const handleDelete = () => {
    setDeleteConfirmationModalOpen(true);
    setIsActionsPopoverOpen(false);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationModalOpen(false);
  };

  return (
    <EuiPanel
      data-test-subj="sloItem"
      color={isDeletingSlo ? 'subdued' : undefined}
      hasBorder
      hasShadow={false}
      style={{
        opacity: isDeletingSlo ? 0.3 : 1,
        transition: 'opacity 0.1s ease-in',
      }}
    >
      <EuiFlexGroup responsive={false} alignItems="center">
        {/* CONTENT */}
        <EuiFlexItem grow>
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem>
                  <EuiText size="s">
                    <EuiLink onClick={handleViewDetails}>{slo.name}</EuiLink>
                  </EuiText>
                </EuiFlexItem>
                <SloBadges slo={slo} activeAlerts={activeAlerts} />
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <SloSummary
                slo={slo}
                historicalSummary={historicalSummary}
                historicalSummaryLoading={historicalSummaryLoading}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* ACTIONS */}
        <EuiFlexItem grow={false}>
          <EuiPopover
            anchorPosition="downLeft"
            button={
              <EuiButtonIcon
                aria-label="Actions"
                display="empty"
                color="text"
                iconType="boxesVertical"
                size="s"
                onClick={handleClickActions}
              />
            }
            panelPaddingSize="none"
            closePopover={handleClickActions}
            isOpen={isActionsPopoverOpen}
          >
            <EuiContextMenuPanel
              size="s"
              items={[
                <EuiContextMenuItem
                  key="view"
                  icon="inspect"
                  onClick={handleViewDetails}
                  data-test-subj="sloActionsView"
                >
                  {i18n.translate('xpack.observability.slo.slo.item.actions.details', {
                    defaultMessage: 'Details',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="edit"
                  icon="pencil"
                  disabled={!hasWriteCapabilities}
                  onClick={handleEdit}
                  data-test-subj="sloActionsEdit"
                >
                  {i18n.translate('xpack.observability.slo.slo.item.actions.edit', {
                    defaultMessage: 'Edit',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="clone"
                  disabled={!hasWriteCapabilities}
                  icon="copy"
                  onClick={handleClone}
                  data-test-subj="sloActionsClone"
                >
                  {i18n.translate('xpack.observability.slo.slo.item.actions.clone', {
                    defaultMessage: 'Clone',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="delete"
                  icon="trash"
                  disabled={!hasWriteCapabilities}
                  onClick={handleDelete}
                  data-test-subj="sloActionsDelete"
                >
                  {i18n.translate('xpack.observability.slo.slo.item.actions.delete', {
                    defaultMessage: 'Delete',
                  })}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isDeleteConfirmationModalOpen ? (
        <SloDeleteConfirmationModal slo={slo} onCancel={handleDeleteCancel} />
      ) : null}
    </EuiPanel>
  );
}
