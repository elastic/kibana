/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiDataGridColumn, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  ENTITY_DISPLAY_NAME,
  ENTITY_LAST_SEEN,
  ENTITY_TYPE,
} from '@kbn/observability-shared-plugin/common';

const alertsLabel = i18n.translate('xpack.inventory.entitiesGrid.euiDataGrid.alertsLabel', {
  defaultMessage: 'Alerts',
});

const alertsTooltip = i18n.translate('xpack.inventory.entitiesGrid.euiDataGrid.alertsTooltip', {
  defaultMessage: 'The count of the active alerts',
});

const entityNameLabel = i18n.translate('xpack.inventory.entitiesGrid.euiDataGrid.entityNameLabel', {
  defaultMessage: 'Entity name',
});
const entityNameTooltip = i18n.translate(
  'xpack.inventory.entitiesGrid.euiDataGrid.entityNameTooltip',
  {
    defaultMessage: 'Name of the entity (entity.displayName)',
  }
);

const entityTypeLabel = i18n.translate('xpack.inventory.entitiesGrid.euiDataGrid.typeLabel', {
  defaultMessage: 'Type',
});
const entityTypeTooltip = i18n.translate('xpack.inventory.entitiesGrid.euiDataGrid.typeTooltip', {
  defaultMessage: 'Type of entity (entity.type)',
});

const entityLastSeenLabel = i18n.translate(
  'xpack.inventory.entitiesGrid.euiDataGrid.lastSeenLabel',
  {
    defaultMessage: 'Last seen',
  }
);
const entityLastSeenToolip = i18n.translate(
  'xpack.inventory.entitiesGrid.euiDataGrid.lastSeenTooltip',
  {
    defaultMessage: 'Timestamp of last received data for entity (entity.lastSeenTimestamp)',
  }
);

const CustomHeaderCell = ({ title, tooltipContent }: { title: string; tooltipContent: string }) => (
  <>
    <span>{title}</span>
    <EuiToolTip content={tooltipContent}>
      <EuiButtonIcon
        data-test-subj="inventoryCustomHeaderCellButton"
        iconType="questionInCircle"
        aria-label={tooltipContent}
        color="primary"
      />
    </EuiToolTip>
  </>
);

export const getColumns = ({
  showAlertsColumn,
}: {
  showAlertsColumn: boolean;
}): EuiDataGridColumn[] => {
  return [
    ...(showAlertsColumn
      ? [
          {
            id: 'alertsCount',
            displayAsText: alertsLabel,
            isSortable: true,
            display: <CustomHeaderCell title={alertsLabel} tooltipContent={alertsTooltip} />,
            initialWidth: 100,
            schema: 'numeric',
          },
        ]
      : []),
    {
      id: ENTITY_DISPLAY_NAME,
      // keep it for accessibility purposes
      displayAsText: entityNameLabel,
      display: <CustomHeaderCell title={entityNameLabel} tooltipContent={entityNameTooltip} />,
      isSortable: true,
    },
    {
      id: ENTITY_TYPE,
      // keep it for accessibility purposes
      displayAsText: entityTypeLabel,
      display: <CustomHeaderCell title={entityTypeLabel} tooltipContent={entityTypeTooltip} />,
      isSortable: true,
    },
    {
      id: ENTITY_LAST_SEEN,
      // keep it for accessibility purposes
      displayAsText: entityLastSeenLabel,
      display: (
        <CustomHeaderCell title={entityLastSeenLabel} tooltipContent={entityLastSeenToolip} />
      ),
      defaultSortDirection: 'desc',
      isSortable: true,
      schema: 'datetime',
    },
  ];
};
