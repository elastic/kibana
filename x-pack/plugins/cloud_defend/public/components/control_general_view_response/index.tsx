/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState, useCallback, FormEvent } from 'react';
import {
  EuiFlexGroup,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiForm,
} from '@elastic/eui';
import { useStyles } from './styles';
import type { ControlGeneralViewResponseDeps } from '../../types';
import * as i18n from '../control_general_view/translations';

export const ControlGeneralViewResponse = ({
  response,
  onRemove,
  onDuplicate,
}: ControlGeneralViewResponseDeps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const styles = useStyles();
  const items = useMemo(() => {
    return [
      {
        key: 'duplicate',
        name: i18n.duplicate,
        icon: 'duplicate',
        onClick: () => {
          onDuplicate(response);
        },
      },
    ];
  }, [onDuplicate, response]);

  const closePopover = useCallback(() => {
    setPopoverOpen(false);
  }, []);

  const onRemoveClicked = useCallback(() => {
    onRemove(response);
    closePopover();
  }, [closePopover, onRemove, response]);

  const onDuplicateClicked = useCallback(() => {
    onDuplicate(response);
    closePopover();
  }, [closePopover, onDuplicate, response]);

  const onChange = useCallback((event: FormEvent<HTMLInputElement>) => {
    console.log(event);
  }, []);

  return (
    <EuiFlexGroup>
      <EuiPopover
        button={<EuiButtonIcon iconType="boxesHorizontal" />}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          size="s"
          items={[
            <EuiContextMenuItem key="duplicate" icon="duplicate" onClick={onDuplicateClicked}>
              {i18n.duplicate}
            </EuiContextMenuItem>,
            <EuiContextMenuItem key="remove" icon="remove" onClick={onRemoveClicked}>
              {i18n.remove}
            </EuiContextMenuItem>,
          ]}
        />
      </EuiPopover>
      <EuiForm component="form">
        {/* <EuiFormRow label={i18n.name} onChange={onChange}>
          <EuiFieldText name="name" value={response.actions} />
        </EuiFormRow>*/}
      </EuiForm>
    </EuiFlexGroup>
  );
};
