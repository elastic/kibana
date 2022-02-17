/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { dataVisualizerRefresh$, Refresh } from '../../services/timefilter_refresh_service';

export interface DataVisualizerIndexPatternManagementProps {
  /**
   * Currently selected data view
   */
  currentIndexPattern?: IndexPattern;
  /**
   * Read from the Fields API
   */
  useNewFieldsApi?: boolean;
}

export function DataVisualizerIndexPatternManagement(
  props: DataVisualizerIndexPatternManagementProps
) {
  const {
    services: { dataViewFieldEditor, application },
  } = useDataVisualizerKibana();

  const { useNewFieldsApi, currentIndexPattern } = props;
  const indexPatternFieldEditPermission = dataViewFieldEditor?.userPermissions.editIndexPattern();
  const canEditIndexPatternField = !!indexPatternFieldEditPermission && useNewFieldsApi;
  const [isAddIndexPatternFieldPopoverOpen, setIsAddIndexPatternFieldPopoverOpen] = useState(false);

  const closeFieldEditor = useRef<() => void | undefined>();
  useEffect(() => {
    return () => {
      // Make sure to close the editor when unmounting
      if (closeFieldEditor.current) {
        closeFieldEditor.current();
      }
    };
  }, []);

  if (dataViewFieldEditor === undefined || !currentIndexPattern || !canEditIndexPatternField) {
    return null;
  }

  const addField = () => {
    closeFieldEditor.current = dataViewFieldEditor.openEditor({
      ctx: {
        dataView: currentIndexPattern,
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
      isOpen={isAddIndexPatternFieldPopoverOpen}
      closePopover={() => {
        setIsAddIndexPatternFieldPopoverOpen(false);
      }}
      ownFocus
      data-test-subj="dataVisualizerIndexPatternManagementPopover"
      button={
        <EuiButtonIcon
          color="text"
          iconType="boxesHorizontal"
          data-test-subj="dataVisualizerIndexPatternManagementButton"
          aria-label={i18n.translate(
            'xpack.dataVisualizer.index.dataViewManagement.actionsPopoverLabel',
            {
              defaultMessage: 'Data view settings',
            }
          )}
          onClick={() => {
            setIsAddIndexPatternFieldPopoverOpen(!isAddIndexPatternFieldPopoverOpen);
          }}
        />
      }
    >
      <EuiContextMenuPanel
        data-test-subj="dataVisualizerIndexPatternManagementMenu"
        size="s"
        items={[
          <EuiContextMenuItem
            key="add"
            icon="indexOpen"
            data-test-subj="dataVisualizerAddIndexPatternFieldAction"
            onClick={() => {
              setIsAddIndexPatternFieldPopoverOpen(false);
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
            data-test-subj="dataVisualizerManageIndexPatternAction"
            onClick={() => {
              setIsAddIndexPatternFieldPopoverOpen(false);
              application.navigateToApp('management', {
                path: `/kibana/indexPatterns/patterns/${props.currentIndexPattern?.id}`,
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
