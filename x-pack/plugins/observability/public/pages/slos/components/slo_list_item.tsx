/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { HistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useKibana } from '../../../utils/kibana_react';
import { useCreateOrUpdateSlo } from '../../../hooks/slo/use_create_slo';
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
  onCloned: () => void;
  onCloning: () => void;
  onDeleted: () => void;
  onDeleting: () => void;
}

export function SloListItem({
  slo,
  historicalSummary = [],
  historicalSummaryLoading,
  onCloned,
  onCloning,
  onDeleted,
  onDeleting,
}: SloListItemProps) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const { createSlo, loading: isCloning, success: isCloned } = useCreateOrUpdateSlo();

  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [isDeleteConfirmationModalOpen, setDeleteConfirmationModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClickActions = () => {
    setIsActionsPopoverOpen(!isActionsPopoverOpen);
  };

  const handleEdit = () => {
    navigateToUrl(basePath.prepend(paths.observability.sloEdit(slo.id)));
  };

  const handleClone = () => {
    const newSlo = transformValuesToCreateSLOInput(
      transformSloResponseToCreateSloInput({ ...slo, name: `[Copy] ${slo.name}` })!
    );

    createSlo(newSlo);
    setIsActionsPopoverOpen(false);
  };

  const handleDelete = () => {
    setDeleteConfirmationModalOpen(true);
    setIsDeleting(true);
    setIsActionsPopoverOpen(false);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationModalOpen(false);
    setIsDeleting(false);
  };

  const handleDeleteSuccess = () => {
    setDeleteConfirmationModalOpen(false);
    onDeleted();
  };

  useEffect(() => {
    if (isCloning) {
      onCloning();
    }

    if (isCloned) {
      onCloned();
    }
  }, [isCloned, isCloning, onCloned, onCloning]);

  return (
    <EuiPanel
      data-test-subj="sloItem"
      hasBorder
      hasShadow={false}
      color={isCloning || isDeleting ? 'subdued' : undefined}
      style={{ opacity: isCloning || isDeleting ? 0.3 : 1, transition: 'opacity 0.15s ease-in' }}
    >
      <EuiFlexGroup responsive={false} alignItems="center">
        {/* CONTENT */}
        <EuiFlexItem grow>
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem>
                  <EuiText size="s">{slo.name}</EuiText>
                </EuiFlexItem>
                <SloBadges slo={slo} />
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
                  key="edit"
                  icon="pencil"
                  onClick={handleEdit}
                  data-test-subj="sloActionsEdit"
                >
                  {i18n.translate('xpack.observability.slos.slo.item.actions.edit', {
                    defaultMessage: 'Edit',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="clone"
                  icon="copy"
                  onClick={handleClone}
                  data-test-subj="sloActionsClone"
                >
                  {i18n.translate('xpack.observability.slos.slo.item.actions.clone', {
                    defaultMessage: 'Clone',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="delete"
                  icon="trash"
                  onClick={handleDelete}
                  data-test-subj="sloActionsDelete"
                >
                  {i18n.translate('xpack.observability.slos.slo.item.actions.delete', {
                    defaultMessage: 'Delete',
                  })}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isDeleteConfirmationModalOpen ? (
        <SloDeleteConfirmationModal
          slo={slo}
          onCancel={handleDeleteCancel}
          onDeleting={onDeleting}
          onDeleted={handleDeleteSuccess}
        />
      ) : null}
    </EuiPanel>
  );
}
