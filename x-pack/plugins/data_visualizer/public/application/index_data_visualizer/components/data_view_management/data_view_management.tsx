/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataView } from '../../../../../../../../src/plugins/data_views/public';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { dataVisualizerRefresh$, Refresh } from '../../services/timefilter_refresh_service';

export interface DataVisualizerDataViewManagementProps {
  /**
   * Currently selected data view
   */
  currentDataView?: DataView;
  /**
   * Read from the Fields API
   */
  useNewFieldsApi?: boolean;
}

export function DataVisualizerDataViewManagement(props: DataVisualizerDataViewManagementProps) {
  const {
    services: { dataViewFieldEditor, application },
  } = useDataVisualizerKibana();

  const { useNewFieldsApi, currentDataView } = props;
  const dataViewFieldEditPermission = dataViewFieldEditor?.userPermissions.editIndexPattern();
  const canEditDataViewField = !!dataViewFieldEditPermission && useNewFieldsApi;
  const [isAddDataViewFieldPopoverOpen, setIsAddDataViewFieldPopoverOpen] = useState(false);

  const closeFieldEditor = useRef<() => void | undefined>();
  useEffect(() => {
    return () => {
      // Make sure to close the editor when unmounting
      if (closeFieldEditor.current) {
        closeFieldEditor.current();
      }
    };
  }, []);

  if (dataViewFieldEditor === undefined || !currentDataView || !canEditDataViewField) {
    return null;
  }

  const addField = () => {
    closeFieldEditor.current = dataViewFieldEditor.openEditor({
      ctx: {
        dataView: currentDataView,
      },
      onSave: () => {
        const refresh: Refresh = {
          lastRefresh: Date.now(),
        };
        dataVisualizerRefresh$.next(refresh);
      },
    });
  };

  return (
    <EuiPopover
      panelPaddingSize="s"
      isOpen={isAddDataViewFieldPopoverOpen}
      closePopover={() => {
        setIsAddDataViewFieldPopoverOpen(false);
      }}
      ownFocus
      data-test-subj="dataVisualizerDataViewManagementPopover"
      button={
        <EuiButtonIcon
          color="text"
          iconType="boxesHorizontal"
          data-test-subj="dataVisualizerDataViewManagementButton"
          aria-label={i18n.translate(
            'xpack.dataVisualizer.index.dataViewManagement.actionsPopoverLabel',
            {
              defaultMessage: 'Data view settings',
            }
          )}
          onClick={() => {
            setIsAddDataViewFieldPopoverOpen(!isAddDataViewFieldPopoverOpen);
          }}
        />
      }
    >
      <EuiContextMenuPanel
        data-test-subj="dataVisualizerDataViewManagementMenu"
        size="s"
        items={[
          <EuiContextMenuItem
            key="add"
            icon="indexOpen"
            data-test-subj="dataVisualizerAddDataViewFieldAction"
            onClick={() => {
              setIsAddDataViewFieldPopoverOpen(false);
              addField();
            }}
          >
            {i18n.translate('xpack.dataVisualizer.index.dataViewManagement.addFieldButton', {
              defaultMessage: 'Add field to data view',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="manage"
            icon="indexSettings"
            data-test-subj="dataVisualizerManageDataViewAction"
            onClick={() => {
              setIsAddDataViewFieldPopoverOpen(false);
              application.navigateToApp('management', {
                path: `/kibana/dataViews/dataView/${props.currentDataView?.id}`,
              });
            }}
          >
            {i18n.translate('xpack.dataVisualizer.index.dataViewManagement.manageFieldButton', {
              defaultMessage: 'Manage data view fields',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
}
